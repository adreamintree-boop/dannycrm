import { useState, useCallback, useRef } from 'react';
import { BLRecord, SearchFilter, searchBLDataByCategory, FilterType } from '@/data/blMockData';
import { SearchCategory } from '@/components/bl-search/BLSearchStrip';

interface UseBLSearchReturn {
  // Filters (right panel)
  filters: SearchFilter[];
  addFilter: () => void;
  removeFilter: (id: string) => void;
  updateFilter: (id: string, type: FilterType, value: string) => void;
  resetFilters: () => void;
  
  // Main keyword (top strip - independent from filters)
  setMainKeyword: (keyword: string) => void;
  setDateRange: (start: Date | undefined, end: Date | undefined) => void;
  setSearchCategory: (category: SearchCategory) => void;
  
  // Search
  results: BLRecord[];
  isLoading: boolean;
  hasSearched: boolean;
  search: () => void;
  validationError: string | null;
  
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  paginatedResults: BLRecord[];
  
  // Sorting
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;
}

const generateFilterId = () => `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createDefaultFilter = (): SearchFilter => ({
  id: generateFilterId(),
  type: 'productName',
  value: ''
});

export function useBLSearch(): UseBLSearchReturn {
  // Filter state (right panel - completely independent)
  const [filters, setFilters] = useState<SearchFilter[]>([createDefaultFilter()]);
  
  // Main keyword state (top strip - independent from filters)
  const mainKeywordRef = useRef<string>('');
  const dateRangeRef = useRef<{ start?: Date; end?: Date }>({});
  const searchCategoryRef = useRef<SearchCategory>('bl');
  
  // Search state
  const [results, setResults] = useState<BLRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Sorting state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Set main keyword (does NOT affect filters)
  const setMainKeyword = useCallback((keyword: string) => {
    mainKeywordRef.current = keyword;
  }, []);

  // Set date range
  const setDateRange = useCallback((start: Date | undefined, end: Date | undefined) => {
    dateRangeRef.current = { start, end };
  }, []);

  // Set search category
  const setSearchCategory = useCallback((category: SearchCategory) => {
    searchCategoryRef.current = category;
  }, []);

  // Filter management
  const addFilter = useCallback(() => {
    setFilters(prev => [...prev, createDefaultFilter()]);
    setValidationError(null);
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters(prev => {
      const newFilters = prev.filter(f => f.id !== id);
      // Keep at least one filter
      return newFilters.length > 0 ? newFilters : [createDefaultFilter()];
    });
    setValidationError(null);
  }, []);

  const updateFilter = useCallback((id: string, type: FilterType, value: string) => {
    setFilters(prev => prev.map(f => 
      f.id === id ? { ...f, type, value } : f
    ));
    setValidationError(null);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters([createDefaultFilter()]);
    setResults([]);
    setHasSearched(false);
    setCurrentPage(1);
    setValidationError(null);
    mainKeywordRef.current = '';
  }, []);

  // Search function with field-specific matching
  const search = useCallback(() => {
    const mainKeyword = mainKeywordRef.current.trim();
    const category = searchCategoryRef.current;
    const hasValidFilter = filters.some(f => f.value.trim() !== '');
    
    // Validation: either mainKeyword or at least one filter must have value
    if (!mainKeyword && !hasValidFilter) {
      setValidationError('검색 조건을 최소 1개 이상 입력해주세요.');
      return;
    }

    setValidationError(null);
    setIsLoading(true);
    setHasSearched(true);

    // Simulate async search (for future API integration)
    setTimeout(() => {
      // Build effective filters from filter panel
      const panelFilters: SearchFilter[] = filters
        .filter(f => f.value.trim())
        .map(f => ({ ...f }));
      
      // Field-specific search: use category to determine which field to search
      let searchResults = searchBLDataByCategory(mainKeyword, category, panelFilters);
      
      // Apply date range filter
      const { start, end } = dateRangeRef.current;
      if (start || end) {
        searchResults = searchResults.filter(record => {
          const recordDate = new Date(record.date);
          if (start && recordDate < start) return false;
          if (end && recordDate > end) return false;
          return true;
        });
      }
      
      // Sort by date
      const sortedResults = [...searchResults].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
      
      setResults(sortedResults);
      setCurrentPage(1);
      setIsLoading(false);
    }, 300);
  }, [filters, sortOrder]);

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => {
      const newOrder = prev === 'desc' ? 'asc' : 'desc';
      // Re-sort existing results
      setResults(prevResults => [...prevResults].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }));
      return newOrder;
    });
  }, []);

  // Pagination
  const totalPages = Math.ceil(results.length / pageSize);
  const paginatedResults = results.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return {
    filters,
    addFilter,
    removeFilter,
    updateFilter,
    resetFilters,
    setMainKeyword,
    setDateRange,
    setSearchCategory,
    results,
    isLoading,
    hasSearched,
    search,
    validationError,
    currentPage,
    setCurrentPage,
    pageSize,
    totalPages,
    paginatedResults,
    sortOrder,
    toggleSortOrder
  };
}
