// B/L Mock Data - Now powered by Excel import
// This file contains the interface and search functions for B/L records

export interface BLRecord {
  id: string;
  date: string;
  importer: string;
  exporter: string;
  hsCode: string;
  productName: string;
  quantity: string;
  weight: string;
  valueUSD: number;
  originCountry: string;
  destinationCountry: string;
  // Additional fields for detail view
  importerAddress?: string;
  exporterAddress?: string;
  transitCountry?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  incoterms?: string;
  importCountry?: string; // Import Country from Excel
}

// Empty array - will be populated by Excel loader
export let mockBLData: BLRecord[] = [];

// Function to set the BL data (called by Excel loader)
export function setBLData(data: BLRecord[]) {
  mockBLData = data;
}

// Normalize text for robust keyword search (handles casing + hidden chars)
function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    // remove zero-width spaces / BOM that often appear in Excel exports
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Filter type for search parameters
export type FilterType = 'productName' | 'hsCode' | 'importer' | 'exporter';

export interface SearchFilter {
  id: string;
  type: FilterType;
  value: string;
}

// Search category type (matches the UI tabs)
export type SearchCategoryType = 'product' | 'hscode' | 'importer' | 'exporter' | 'bl';

// Field-specific search function - matches keyword ONLY to the selected category field
export function searchBLDataByCategory(
  keyword: string,
  category: SearchCategoryType,
  additionalFilters: SearchFilter[] = []
): BLRecord[] {
  const searchValue = normalizeForSearch(keyword);

  // If no keyword and no additional filters, return empty
  if (!searchValue && additionalFilters.every(f => !f.value.trim())) {
    return [];
  }

  return mockBLData.filter(record => {
    // First, apply the main keyword search based on category
    if (searchValue) {
      let categoryMatch = false;

      switch (category) {
        case 'product':
          // Search ONLY in product description
          categoryMatch = normalizeForSearch(record.productName).includes(searchValue);
          break;
        case 'hscode':
          // Search ONLY in HS code (partial match allowed)
          categoryMatch = normalizeForSearch(record.hsCode).includes(searchValue);
          break;
        case 'importer':
          // Search ONLY in importer name
          categoryMatch = normalizeForSearch(record.importer).includes(searchValue);
          break;
        case 'exporter':
          // Search ONLY in exporter name
          categoryMatch = normalizeForSearch(record.exporter).includes(searchValue);
          break;
        case 'bl':
          // B/L category: search across all main fields (legacy behavior)
          categoryMatch =
            normalizeForSearch(record.productName).includes(searchValue) ||
            normalizeForSearch(record.hsCode).includes(searchValue) ||
            normalizeForSearch(record.importer).includes(searchValue) ||
            normalizeForSearch(record.exporter).includes(searchValue);
          break;
        default:
          categoryMatch = true;
      }

      // If the main keyword doesn't match the category field, exclude this record
      if (!categoryMatch) {
        return false;
      }
    }

    // Then, apply additional filters from the filter panel (AND logic)
    return additionalFilters.every(filter => {
      const filterValue = normalizeForSearch(filter.value);
      if (!filterValue) return true; // Empty filter is ignored

      switch (filter.type) {
        case 'productName':
          return normalizeForSearch(record.productName).includes(filterValue);
        case 'hsCode':
          return normalizeForSearch(record.hsCode).includes(filterValue);
        case 'importer':
          return normalizeForSearch(record.importer).includes(filterValue);
        case 'exporter':
          return normalizeForSearch(record.exporter).includes(filterValue);
        default:
          return true;
      }
    });
  });
}

// Legacy search function - kept for backward compatibility
export function searchBLData(filters: SearchFilter[]): BLRecord[] {
  // If no filters, return empty (validation should prevent this)
  if (filters.length === 0 || filters.every(f => !f.value.trim())) {
    return [];
  }

  return mockBLData.filter(record => {
    // All filters must match (AND logic)
    return filters.every(filter => {
      const searchValue = normalizeForSearch(filter.value);
      if (!searchValue) return true; // Empty filter is ignored

      switch (filter.type) {
        case 'productName':
          return normalizeForSearch(record.productName).includes(searchValue);
        case 'hsCode':
          return normalizeForSearch(record.hsCode).includes(searchValue);
        case 'importer':
          return normalizeForSearch(record.importer).includes(searchValue);
        case 'exporter':
          return normalizeForSearch(record.exporter).includes(searchValue);
        default:
          return true;
      }
    });
  });
}


// Utility function to highlight matched text
export function highlightMatch(text: string, searchTerms: string[]): { text: string; highlighted: boolean }[] {
  if (!searchTerms.length || searchTerms.every(t => !t.trim())) {
    return [{ text, highlighted: false }];
  }

  const lowerText = text.toLowerCase();
  const segments: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  // Find all matches and their positions
  const matches: { start: number; end: number }[] = [];
  
  searchTerms.forEach(term => {
    if (!term.trim()) return;
    const lowerTerm = term.toLowerCase();
    let index = lowerText.indexOf(lowerTerm);
    while (index !== -1) {
      matches.push({ start: index, end: index + term.length });
      index = lowerText.indexOf(lowerTerm, index + 1);
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const mergedMatches: { start: number; end: number }[] = [];
  matches.forEach(match => {
    if (mergedMatches.length === 0) {
      mergedMatches.push(match);
    } else {
      const last = mergedMatches[mergedMatches.length - 1];
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end);
      } else {
        mergedMatches.push(match);
      }
    }
  });

  // Build segments
  mergedMatches.forEach(match => {
    if (match.start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.start), highlighted: false });
    }
    segments.push({ text: text.slice(match.start, match.end), highlighted: true });
    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }];
}
