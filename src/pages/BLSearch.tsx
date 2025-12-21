import React, { useState } from 'react';
import { subMonths } from 'date-fns';
import BLLeftMenu from '@/components/bl-search/BLLeftMenu';
import BLSearchStrip from '@/components/bl-search/BLSearchStrip';
import BLRecentSearches from '@/components/bl-search/BLRecentSearches';
import BLDataUpdates from '@/components/bl-search/BLDataUpdates';
import BLResultsTable from '@/components/bl-search/BLResultsTable';
import BLFilterPanel from '@/components/bl-search/BLFilterPanel';
import { useBLSearch } from '@/hooks/useBLSearch';

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
    toggleSortOrder
  } = useBLSearch();

  // Search strip state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const handleSearch = () => {
    // If searchKeyword is provided, add it to productName filter if not already
    if (searchKeyword.trim()) {
      const productFilter = filters.find(f => f.type === 'productName');
      if (productFilter) {
        updateFilter(productFilter.id, 'productName', searchKeyword);
      }
    }
    search();
  };

  const handleImport = () => {
    // Placeholder for import functionality
    console.log('Import clicked');
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-background">
      {/* Left Icon Menu */}
      <BLLeftMenu />

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
              isLoading={isLoading}
              hasSearched={hasSearched}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
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
          onSearch={handleSearch}
          validationError={validationError}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default BLSearch;
