import { useState, useCallback } from 'react';
import { BLRecord, SearchFilter, searchBLData, FilterType } from '@/data/blMockData';

interface UseBLSearchReturn {
  // Filters
  filters: SearchFilter[];
  addFilter: () => void;
  removeFilter: (id: string) => void;
  updateFilter: (id: string, type: FilterType, value: string) => void;
  resetFilters: () => void;
  
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
  // Filter state
  const [filters, setFilters] = useState<SearchFilter[]>([createDefaultFilter()]);
  
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
  }, []);

  // Search function
  const search = useCallback(() => {
    // Validation: at least one filter must have a value
    const hasValidFilter = filters.some(f => f.value.trim() !== '');
    
    if (!hasValidFilter) {
      setValidationError('Please enter at least one search condition.');
      return;
    }

    setValidationError(null);
    setIsLoading(true);
    setHasSearched(true);

    // Simulate async search (for future API integration)
    setTimeout(() => {
      const searchResults = searchBLData(filters);
      
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
