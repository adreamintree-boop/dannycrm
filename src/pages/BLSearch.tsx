import React, { useState, useCallback, useEffect, useRef } from 'react';
import { subMonths } from 'date-fns';
import BLSearchStrip, { SearchCategory } from '@/components/bl-search/BLSearchStrip';
import BLRecentSearches from '@/components/bl-search/BLRecentSearches';
import BLDataUpdates from '@/components/bl-search/BLDataUpdates';
import BLResultsTable from '@/components/bl-search/BLResultsTable';
import BLFilterPanel from '@/components/bl-search/BLFilterPanel';
import { useBLSearch } from '@/hooks/useBLSearch';
import { useBLSearchHistory, BLSearchHistoryItem } from '@/hooks/useBLSearchHistory';
import { useCreditsContext } from '@/context/CreditsContext';
import { toast } from '@/hooks/use-toast';
import { BLRecord } from '@/data/blMockData';
import { generateRowFingerprint, generateSearchKey } from '@/lib/blSearchUtils';

const BLSearch: React.FC = () => {
  const {
    filters,
    addFilter,
    removeFilter,
    updateFilter,
    resetFilters,
    results,
    isLoading,
    hasSearched,
    search,
    validationError,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedResults,
    sortOrder,
    toggleSortOrder,
    setMainKeyword,
    setDateRange,
    setSearchCategory,
    getSearchMeta
  } = useBLSearch();

  const { 
    saveSearch, 
    updateViewedRows, 
    updateLastViewedPage,
    fetchHistory 
  } = useBLSearchHistory();

  const { chargeBLSearchPage, refreshBalance } = useCreditsContext();

  // Search strip state (independent from filter panel)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [searchCategoryState, setSearchCategoryState] = useState<SearchCategory>('bl');
  
  // Track current search key for session
  const currentSearchKeyRef = useRef<string>('');
  const isChargingRef = useRef(false);
  
  // Track current history item for replay mode
  const currentHistoryIdRef = useRef<string | null>(null);
  const isReplayModeRef = useRef(false);
  
  // CRITICAL: Guard flag - credit deduction only happens after explicit search action
  const searchInitiatedRef = useRef(false);

  // Tab change is UI-only - NO search, NO credit deduction
  const handleSearchCategoryChange = (category: SearchCategory) => {
    setSearchCategoryState(category);
    // Only update UI state - do NOT trigger search or credit flow
  };

  // Generate search key from current search state using stable hash
  const getCurrentSearchKey = useCallback(() => {
    return generateSearchKey({
      searchType: searchCategoryState,
      keyword: searchKeyword,
      dateFrom: startDate,
      dateTo: endDate,
      filters: filters,
    });
  }, [searchKeyword, searchCategoryState, filters, startDate, endDate]);

  // Get row fingerprints from paginated results using stable deterministic hash
  const getRowFingerprints = useCallback((rows: BLRecord[]): string[] => {
    return rows.map(row => generateRowFingerprint(row));
  }, []);

  // Charge credits for current page - ONLY when searchInitiated is true
  const chargeForCurrentPage = useCallback(async (rows: BLRecord[], page: number, searchKey: string) => {
    // CRITICAL: Guard - only charge if search was explicitly initiated
    if (!searchInitiatedRef.current) return true;
    if (isChargingRef.current || rows.length === 0) return true;
    
    isChargingRef.current = true;
    
    try {
      const fingerprints = getRowFingerprints(rows);
      const searchMeta = getSearchMeta();
      
      const result = await chargeBLSearchPage(
        searchKey,
        fingerprints,
        page,
        { ...searchMeta, result_count: results.length }
      );

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: '크레딧 부족',
          description: result.error || '크레딧이 부족합니다.',
        });
        return false;
      }

      // Show toast only if credits were actually charged
      if (result.chargedCount && result.chargedCount > 0) {
        toast({
          title: '크레딧 차감',
          description: `이번 페이지 신규 조회: ${result.chargedCount}건 / 차감: ${result.chargedCount} credit`,
        });
      } else if (result.chargedCount === 0) {
        toast({
          title: '추가 차감 없음',
          description: '이미 조회한 페이지입니다.',
        });
      }

      // Update viewed rows in history if we have a history ID
      if (currentHistoryIdRef.current) {
        await updateViewedRows(currentHistoryIdRef.current, fingerprints);
        await updateLastViewedPage(currentHistoryIdRef.current, page);
      }

      await refreshBalance();
      return true;
    } finally {
      isChargingRef.current = false;
    }
  }, [getRowFingerprints, getSearchMeta, chargeBLSearchPage, results.length, refreshBalance, updateViewedRows, updateLastViewedPage]);

  // Handle page changes - charge for new page
  const handlePageChange = useCallback(async (newPage: number) => {
    if (newPage === currentPage) return;
    
    // Calculate which rows will be on the new page
    const pageSize = 10;
    const startIndex = (newPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, results.length);
    const newPageRows = results.slice(startIndex, endIndex);
    
    const searchKey = currentSearchKeyRef.current;
    const success = await chargeForCurrentPage(newPageRows, newPage, searchKey);
    
    if (success) {
      setCurrentPage(newPage);
    }
  }, [currentPage, results, chargeForCurrentPage, setCurrentPage]);

  // Charge for initial page after search completes
  useEffect(() => {
    if (hasSearched && !isLoading && paginatedResults.length > 0 && currentPage === 1) {
      const searchKey = getCurrentSearchKey();
      
      // For replay mode, use the already-set search key (from history query_hash)
      // For new searches, update the search key
      const effectiveSearchKey = isReplayModeRef.current 
        ? currentSearchKeyRef.current 
        : searchKey;
      
      // Only update search key ref for new searches
      if (!isReplayModeRef.current && searchKey !== currentSearchKeyRef.current) {
        currentSearchKeyRef.current = searchKey;
      }
      
      // Always charge - the backend will handle deduplication
      chargeForCurrentPage(paginatedResults, 1, effectiveSearchKey);
    }
  }, [hasSearched, isLoading, paginatedResults, currentPage, getCurrentSearchKey, chargeForCurrentPage]);

  // Save search to history after results
  useEffect(() => {
    if (hasSearched && !isLoading && results.length > 0 && !isReplayModeRef.current) {
      saveSearch({
        searchType: searchCategoryState,
        keyword: searchKeyword,
        dateFrom: startDate,
        dateTo: endDate,
        filters,
        resultCount: results.length,
      }).then(historyItem => {
        if (historyItem) {
          currentHistoryIdRef.current = historyItem.id;
        }
      });
    }
  }, [hasSearched, isLoading, results.length, searchCategoryState, searchKeyword, startDate, endDate, filters, saveSearch]);

  const handleSearch = () => {
    // Reset refs for new search
    currentSearchKeyRef.current = '';
    currentHistoryIdRef.current = null;
    isReplayModeRef.current = false;
    
    // CRITICAL: Set search initiated flag BEFORE calling search
    searchInitiatedRef.current = true;
    
    // Pass main keyword, category, and date range to search hook
    setMainKeyword(searchKeyword);
    setSearchCategory(searchCategoryState);
    setDateRange(startDate, endDate);
    search();
  };

  const handleFilterPanelSearch = () => {
    // Reset refs for new search
    currentSearchKeyRef.current = '';
    currentHistoryIdRef.current = null;
    isReplayModeRef.current = false;
    
    // CRITICAL: Set search initiated flag BEFORE calling search
    searchInitiatedRef.current = true;
    
    // Filter panel search uses date range but NOT main keyword
    setMainKeyword('');
    setSearchCategory(searchCategoryState);
    setDateRange(startDate, endDate);
    search();
  };

  // Handle selecting a history item
  const handleSelectHistory = useCallback((item: BLSearchHistoryItem) => {
    // Set replay mode - we're reopening a previous search
    isReplayModeRef.current = true;
    currentHistoryIdRef.current = item.id;
    
    // CRITICAL: Set search initiated flag for replay mode
    searchInitiatedRef.current = true;
    
    // CRITICAL: Set the search key BEFORE running the search
    // This uses the same query_hash from history, ensuring the backend
    // recognizes this as the same session and doesn't re-charge viewed rows
    currentSearchKeyRef.current = item.query_hash;
    
    // Hydrate the search state from history
    setSearchKeyword(item.keyword);
    setSearchCategoryState(item.search_type);
    
    const historyDateFrom = item.date_from ? new Date(item.date_from) : undefined;
    const historyDateTo = item.date_to ? new Date(item.date_to) : undefined;
    
    if (historyDateFrom) {
      setStartDate(historyDateFrom);
    }
    if (historyDateTo) {
      setEndDate(historyDateTo);
    }
    
    // Apply filters from history - reset and apply
    resetFilters();
    item.filters_json.forEach((f, idx) => {
      if (idx === 0) {
        updateFilter(filters[0]?.id || '', f.type, f.value);
      } else {
        addFilter();
        // Need to apply filter after adding
        setTimeout(() => {
          updateFilter(filters[idx]?.id || '', f.type, f.value);
        }, 0);
      }
    });
    
    // Run the search with hydrated params
    setMainKeyword(item.keyword);
    setSearchCategory(item.search_type);
    setDateRange(historyDateFrom, historyDateTo);
    
    search();
    
    // Refresh history to update last_opened_at
    fetchHistory();
  }, [filters, resetFilters, addFilter, updateFilter, setMainKeyword, setSearchCategory, setDateRange, search, fetchHistory]);

  const handleImport = () => {
    console.log('Import clicked');
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Strip */}
        <BLSearchStrip
          searchKeyword={searchKeyword}
          onSearchKeywordChange={setSearchKeyword}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSearch={handleSearch}
          onImport={handleImport}
          isLoading={isLoading}
          searchCategory={searchCategoryState}
          onSearchCategoryChange={handleSearchCategoryChange}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Before search - show Recent Searches and Data Updates */}
          {!hasSearched && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BLRecentSearches onSelectHistory={handleSelectHistory} />
              <BLDataUpdates />
            </div>
          )}

          {/* After search - show Results Table */}
          {(hasSearched || isLoading) && (
            <BLResultsTable
              results={results}
              paginatedResults={paginatedResults}
              filters={filters}
              mainKeyword={searchKeyword}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
              hasSearched={hasSearched}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              sortOrder={sortOrder}
              onToggleSortOrder={toggleSortOrder}
            />
          )}
        </div>
      </div>

      {/* Right Filter Panel */}
      <div className="w-[280px] shrink-0 border-l border-border bg-muted/20 overflow-hidden">
        <BLFilterPanel
          filters={filters}
          onAddFilter={addFilter}
          onRemoveFilter={removeFilter}
          onUpdateFilter={updateFilter}
          onReset={resetFilters}
          onSearch={handleFilterPanelSearch}
          validationError={validationError}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default BLSearch;
