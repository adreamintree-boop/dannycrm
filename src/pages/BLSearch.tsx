import React, { useState, useCallback, useEffect, useRef } from 'react';
import { subMonths } from 'date-fns';
import BLSearchHeader, { SearchCategory } from '@/components/bl-search/BLSearchHeader';
import BLRecentSearches from '@/components/bl-search/BLRecentSearches';
import BLDataUpdates from '@/components/bl-search/BLDataUpdates';
import BLCompactResultsTable from '@/components/bl-search/BLCompactResultsTable';
import BLSummaryPanel from '@/components/bl-search/BLSummaryPanel';
import { useBLSearch } from '@/hooks/useBLSearch';
import { useBLSearchHistory, BLSearchHistoryItem } from '@/hooks/useBLSearchHistory';
import { useCreditsContext } from '@/context/CreditsContext';
import { toast } from '@/hooks/use-toast';
import { BLRecord } from '@/data/blMockData';
import { generateRowFingerprint, generateSearchKey } from '@/lib/blSearchUtils';
import { loadBLDataFromExcel } from '@/data/blExcelLoader';

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

  // Search strip state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [searchCategoryState, setSearchCategoryState] = useState<SearchCategory>('importer');
  
  // Track loaded results for "Load More" functionality
  const [displayedResults, setDisplayedResults] = useState<BLRecord[]>([]);
  const [displayedPage, setDisplayedPage] = useState(1);
  const pageSize = 10;
  
  // Track current search key for session
  const currentSearchKeyRef = useRef<string>('');
  const isChargingRef = useRef(false);
  
  // Track current history item for replay mode
  const currentHistoryIdRef = useRef<string | null>(null);
  const isReplayModeRef = useRef(false);
  
  // CRITICAL: Guard flag - credit deduction only happens after explicit search action
  const searchInitiatedRef = useRef(false);
  
  // Load Excel data on mount
  const [dataLoaded, setDataLoaded] = useState(false);
  
  useEffect(() => {
    loadBLDataFromExcel().then((records) => {
      if (records.length > 0) {
        setDataLoaded(true);
        console.log(`B/L data loaded: ${records.length} records`);
      }
    });
  }, []);

  // Reset displayed results when new search happens
  useEffect(() => {
    if (hasSearched && results.length > 0) {
      setDisplayedResults(results.slice(0, pageSize));
      setDisplayedPage(1);
    } else {
      setDisplayedResults([]);
      setDisplayedPage(1);
    }
  }, [hasSearched, results]);

  // Tab change is UI-only
  const handleSearchCategoryChange = (category: SearchCategory) => {
    setSearchCategoryState(category);
  };

  // Map new category type to legacy type for search hook
  const mapCategoryToLegacy = (category: SearchCategory): 'product' | 'hscode' | 'importer' | 'exporter' | 'bl' => {
    switch (category) {
      case 'importer': return 'importer';
      case 'exporter': return 'exporter';
      case 'product': return 'product';
      case 'hscode': return 'hscode';
      default: return 'bl';
    }
  };

  // Generate search key from current search state
  const getCurrentSearchKey = useCallback(() => {
    return generateSearchKey({
      searchType: mapCategoryToLegacy(searchCategoryState),
      keyword: searchKeyword,
      dateFrom: startDate,
      dateTo: endDate,
      filters: filters,
    });
  }, [searchKeyword, searchCategoryState, filters, startDate, endDate]);

  // Get row fingerprints from results
  const getRowFingerprints = useCallback((rows: BLRecord[]): string[] => {
    return rows.map(row => generateRowFingerprint(row));
  }, []);

  // Charge credits for current page
  const chargeForCurrentPage = useCallback(async (rows: BLRecord[], page: number, searchKey: string) => {
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

      if (result.chargedCount && result.chargedCount > 0) {
        toast({
          title: '크레딧 차감',
          description: `이번 페이지 신규 조회: ${result.chargedCount}건 / 차감: ${result.chargedCount} credit`,
        });
      }

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

  // Handle Load More
  const handleLoadMore = useCallback(async () => {
    const nextPage = displayedPage + 1;
    const startIndex = displayedPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, results.length);
    const newRows = results.slice(startIndex, endIndex);
    
    const searchKey = currentSearchKeyRef.current;
    const success = await chargeForCurrentPage(newRows, nextPage, searchKey);
    
    if (success) {
      setDisplayedResults(prev => [...prev, ...newRows]);
      setDisplayedPage(nextPage);
    }
  }, [displayedPage, results, chargeForCurrentPage]);

  // Charge for initial page after search completes
  useEffect(() => {
    if (hasSearched && !isLoading && displayedResults.length > 0 && displayedPage === 1) {
      const searchKey = getCurrentSearchKey();
      
      const effectiveSearchKey = isReplayModeRef.current 
        ? currentSearchKeyRef.current 
        : searchKey;
      
      if (!isReplayModeRef.current && searchKey !== currentSearchKeyRef.current) {
        currentSearchKeyRef.current = searchKey;
      }
      
      chargeForCurrentPage(displayedResults, 1, effectiveSearchKey);
    }
  }, [hasSearched, isLoading, displayedResults, displayedPage, getCurrentSearchKey, chargeForCurrentPage]);

  // Save search to history after results
  useEffect(() => {
    if (hasSearched && !isLoading && results.length > 0 && !isReplayModeRef.current) {
      saveSearch({
        searchType: mapCategoryToLegacy(searchCategoryState),
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
    currentSearchKeyRef.current = '';
    currentHistoryIdRef.current = null;
    isReplayModeRef.current = false;
    searchInitiatedRef.current = true;
    
    setMainKeyword(searchKeyword);
    setSearchCategory(mapCategoryToLegacy(searchCategoryState));
    setDateRange(startDate, endDate);
    search();
  };

  // Handle selecting a history item
  const handleSelectHistory = useCallback((item: BLSearchHistoryItem) => {
    isReplayModeRef.current = true;
    currentHistoryIdRef.current = item.id;
    searchInitiatedRef.current = true;
    currentSearchKeyRef.current = item.query_hash;
    
    setSearchKeyword(item.keyword);
    // Map legacy type to new type
    const categoryMap: Record<string, SearchCategory> = {
      'importer': 'importer',
      'exporter': 'exporter',
      'product': 'product',
      'hscode': 'hscode',
      'bl': 'importer'
    };
    setSearchCategoryState(categoryMap[item.search_type] || 'importer');
    
    const historyDateFrom = item.date_from ? new Date(item.date_from) : undefined;
    const historyDateTo = item.date_to ? new Date(item.date_to) : undefined;
    
    if (historyDateFrom) setStartDate(historyDateFrom);
    if (historyDateTo) setEndDate(historyDateTo);
    
    resetFilters();
    item.filters_json.forEach((f, idx) => {
      if (idx === 0) {
        updateFilter(filters[0]?.id || '', f.type, f.value);
      } else {
        addFilter();
        setTimeout(() => {
          updateFilter(filters[idx]?.id || '', f.type, f.value);
        }, 0);
      }
    });
    
    setMainKeyword(item.keyword);
    setSearchCategory(item.search_type);
    setDateRange(historyDateFrom, historyDateTo);
    
    search();
    fetchHistory();
  }, [filters, resetFilters, addFilter, updateFilter, setMainKeyword, setSearchCategory, setDateRange, search, fetchHistory]);

  const handleSaveSummary = () => {
    toast({
      title: '저장 완료',
      description: '검색 결과가 저장되었습니다.',
    });
  };

  const hasMore = displayedResults.length < results.length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/20">
      {/* Search Header */}
      <BLSearchHeader
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearch={handleSearch}
        isLoading={isLoading}
        searchCategory={searchCategoryState}
        onSearchCategoryChange={handleSearchCategoryChange}
        showViewSummary={hasSearched && results.length > 0}
      />

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Before search - show Recent Searches and Data Updates */}
        {!hasSearched && (
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BLRecentSearches onSelectHistory={handleSelectHistory} />
              <BLDataUpdates />
            </div>
          </div>
        )}

        {/* After search - 2-column layout */}
        {hasSearched && (
          <>
            {/* Left: Results Table */}
            <div className="flex-1 overflow-auto p-6 lg:w-[70%]">
              <BLCompactResultsTable
                results={results}
                paginatedResults={displayedResults}
                filters={filters}
                mainKeyword={searchKeyword}
                startDate={startDate}
                endDate={endDate}
                isLoading={isLoading}
                hasSearched={hasSearched}
                currentPage={displayedPage}
                totalPages={Math.ceil(results.length / pageSize)}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
              />
            </div>

            {/* Right: Summary Panel */}
            {results.length > 0 && (
              <div className="hidden lg:block w-[300px] xl:w-[350px] shrink-0">
                <BLSummaryPanel
                  results={results}
                  startDate={startDate}
                  endDate={endDate}
                  onSave={handleSaveSummary}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BLSearch;
