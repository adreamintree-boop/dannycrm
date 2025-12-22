import { SearchFilter } from '@/data/blMockData';
import { SearchCategory } from '@/components/bl-search/BLSearchStrip';

// Simple hash function for generating fingerprints
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
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
 * Format: sha1(date + '|' + exporter + '|' + importer + '|' + hs_code + '|' + product + '|' + value_usd)
 */
export function generateRowFingerprint(row: {
  date: string;
  exporter: string;
  importer: string;
  hsCode: string;
  productName: string;
  valueUSD: number;
}): string {
  const parts = [
    normalize(row.date),
    normalize(row.exporter),
    normalize(row.importer),
    normalize(row.hsCode),
    normalize(row.productName),
    normalizeNumber(row.valueUSD),
  ];
  
  const input = parts.join('|');
  return `bf_${simpleHash(input)}`;
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
  return `qh_${simpleHash(input)}`;
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
