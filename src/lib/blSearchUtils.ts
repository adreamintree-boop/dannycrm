import { SearchFilter } from '@/data/blMockData';
import { SearchCategory } from '@/components/bl-search/BLSearchStrip';

// Better hash function for generating fingerprints with much lower collision rate
// Uses FNV-1a algorithm with 64-bit simulation for better distribution
function betterHash(str: string): string {
  // FNV-1a 32-bit + additional mixing for better distribution
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h1 ^= char;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= char;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  
  // Combine both hashes for a longer, more unique result
  const hash1 = (h1 >>> 0).toString(36);
  const hash2 = (h2 >>> 0).toString(36);
  return `${hash1}${hash2}`;
}

// Normalize string for consistent hashing
function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

// Normalize number for consistent hashing
function normalizeNumber(value: number | null | undefined): string {
  return (value ?? 0).toString();
}

/**
 * Generate a stable, deterministic row fingerprint from BL record data.
 * This ensures the same row always gets the same fingerprint regardless of
 * when or how it's fetched.
 * 
 * CRITICAL: Uses id (if available) plus all key fields to ensure uniqueness.
 * The id field from Excel is the most reliable unique identifier.
 */
export function generateRowFingerprint(row: {
  id?: string;
  date: string;
  exporter: string;
  importer: string;
  hsCode: string;
  productName: string;
  quantity?: string;
  weight?: string;
  valueUSD: number;
  originCountry?: string;
  destinationCountry?: string;
}): string {
  // Use id as primary identifier if available, otherwise combine multiple fields
  const parts = [
    normalize(row.id || ''), // Primary unique identifier from Excel
    normalize(row.date),
    normalize(row.exporter),
    normalize(row.importer),
    normalize(row.hsCode),
    normalize(row.productName),
    normalize(row.quantity || ''),
    normalize(row.weight || ''),
    normalizeNumber(row.valueUSD),
    normalize(row.originCountry || ''),
    normalize(row.destinationCountry || ''),
  ];
  
  const input = parts.join('|');
  return `bf_${betterHash(input)}`;
}

/**
 * Generate a canonical JSON string for filters.
 * Keys are sorted and values are normalized for consistency.
 */
function canonicalFiltersJson(filters: SearchFilter[]): string {
  const normalizedFilters = filters
    .filter(f => f.value.trim())
    .map(f => ({
      type: f.type,
      value: f.value.trim().toLowerCase(),
    }))
    .sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type);
      if (typeCompare !== 0) return typeCompare;
      return a.value.localeCompare(b.value);
    });
  
  return JSON.stringify(normalizedFilters);
}

/**
 * Normalize a date to YYYY-MM-DD format for consistent hashing.
 */
function normalizeDate(date: Date | undefined | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Normalize keyword for consistent hashing.
 * - Trim whitespace
 * - Collapse multiple spaces to single space
 * - Convert to lowercase
 */
function normalizeKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Generate a stable query hash from search parameters.
 * This ensures the same search always gets the same hash regardless of
 * object key order or formatting.
 * 
 * Format: hash(search_type + '|' + normalized_keyword + '|' + date_from + '|' + date_to + '|' + canonical_filters_json)
 */
export function generateQueryHash(params: {
  searchType: SearchCategory;
  keyword: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  filters: SearchFilter[];
}): string {
  const parts = [
    params.searchType,
    normalizeKeyword(params.keyword),
    normalizeDate(params.dateFrom),
    normalizeDate(params.dateTo),
    canonicalFiltersJson(params.filters),
  ];
  
  const input = parts.join('|');
  return `qh_${betterHash(input)}`;
}

/**
 * Generate a search key for session tracking.
 * This is used by the backend to track which rows have been charged within a session.
 */
export function generateSearchKey(params: {
  searchType: SearchCategory;
  keyword: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  filters: SearchFilter[];
}): string {
  // Use the same logic as query hash for consistency
  return generateQueryHash(params);
}

// Map between DB enum and app SearchCategory
export type DBSearchType = 'bl' | 'product' | 'hs_code' | 'importer' | 'exporter';

export const categoryToDbType: Record<SearchCategory, DBSearchType> = {
  bl: 'bl',
  product: 'product',
  hscode: 'hs_code',
  importer: 'importer',
  exporter: 'exporter',
};

export const dbTypeToCategoryMap: Record<DBSearchType, SearchCategory> = {
  bl: 'bl',
  product: 'product',
  hs_code: 'hscode',
  importer: 'importer',
  exporter: 'exporter',
};
