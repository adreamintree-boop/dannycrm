import React, { useState, useCallback, useEffect, useRef } from 'react';
import { subMonths } from 'date-fns';
import BLSearchStrip, { SearchCategory } from '@/components/bl-search/BLSearchStrip';
import BLRecentSearches from '@/components/bl-search/BLRecentSearches';
import BLDataUpdates from '@/components/bl-search/BLDataUpdates';
import BLResultsTable from '@/components/bl-search/BLResultsTable';
import BLFilterPanel from '@/components/bl-search/BLFilterPanel';
import { useBLSearch } from '@/hooks/useBLSearch';
import { useCreditsContext } from '@/context/CreditsContext';
import { toast } from '@/hooks/use-toast';
import { BLRecord } from '@/data/blMockData';

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

  const { chargeBLSearchPage, generateSearchKey, refreshBalance } = useCreditsContext();

  // Search strip state (independent from filter panel)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [searchCategory, setSearchCategoryState] = useState<SearchCategory>('bl');
  
  // Track current search key for session
  const currentSearchKeyRef = useRef<string>('');
  const isChargingRef = useRef(false);

  const handleSearchCategoryChange = (category: SearchCategory) => {
    setSearchCategoryState(category);
    setSearchCategory(category);
  };

  // Generate search key from current search state
  const getCurrentSearchKey = useCallback(() => {
    const searchMeta = {
      keyword: searchKeyword,
      category: searchCategory,
      filters: filters.filter(f => f.value.trim()).map(f => ({ type: f.type, value: f.value })),
      dateRange: { start: startDate?.toISOString(), end: endDate?.toISOString() },
      sortOrder,
    };
    return generateSearchKey(searchMeta);
  }, [searchKeyword, searchCategory, filters, startDate, endDate, sortOrder, generateSearchKey]);

  // Get row fingerprints from paginated results
  const getRowFingerprints = useCallback((rows: BLRecord[]): string[] => {
    return rows.map(row => row.id);
  }, []);

  // Charge credits for current page
  const chargeForCurrentPage = useCallback(async (rows: BLRecord[], page: number, searchKey: string) => {
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
      }

      await refreshBalance();
      return true;
    } finally {
      isChargingRef.current = false;
    }
  }, [getRowFingerprints, getSearchMeta, chargeBLSearchPage, results.length, refreshBalance]);

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
      
      // Only charge if this is a new search (different search key)
      if (searchKey !== currentSearchKeyRef.current) {
        currentSearchKeyRef.current = searchKey;
        chargeForCurrentPage(paginatedResults, 1, searchKey);
      }
    }
  }, [hasSearched, isLoading, paginatedResults, currentPage, getCurrentSearchKey, chargeForCurrentPage]);

  const handleSearch = () => {
    // Reset search key for new search
    currentSearchKeyRef.current = '';
    
    // Pass main keyword, category, and date range to search hook
    setMainKeyword(searchKeyword);
    setSearchCategory(searchCategory);
    setDateRange(startDate, endDate);
    search();
  };

  const handleFilterPanelSearch = () => {
    // Reset search key for new search
    currentSearchKeyRef.current = '';
    
    // Filter panel search uses date range but NOT main keyword
    setMainKeyword('');
    setDateRange(startDate, endDate);
    search();
  };

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
          searchCategory={searchCategory}
          onSearchCategoryChange={handleSearchCategoryChange}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Before search - show Recent Searches and Data Updates */}
          {!hasSearched && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BLRecentSearches />
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
