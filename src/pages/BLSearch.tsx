import React from 'react';
import { Search } from 'lucide-react';
import FilterPanel from '@/components/bl-search/FilterPanel';
import ResultsTable from '@/components/bl-search/ResultsTable';
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      {/* Main Content - Left */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">B/L Data Search</h1>
              <p className="text-muted-foreground text-sm">
                선하증권(B/L) 데이터 검색 및 조회
              </p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <ResultsTable
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
      </div>

      {/* Filter Panel - Right (Sticky) */}
      <div className="w-[320px] shrink-0 border-l border-border bg-muted/30 p-4 sticky top-0 h-[calc(100vh-3.5rem)] overflow-auto">
        <FilterPanel
          filters={filters}
          onAddFilter={addFilter}
          onRemoveFilter={removeFilter}
          onUpdateFilter={updateFilter}
          onReset={resetFilters}
          onSearch={search}
          validationError={validationError}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default BLSearch;
