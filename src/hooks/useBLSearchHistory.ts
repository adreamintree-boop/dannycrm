import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { SearchCategory } from '@/components/bl-search/BLSearchStrip';
import { SearchFilter } from '@/data/blMockData';

// Map between DB enum and app SearchCategory
type DBSearchType = 'bl' | 'product' | 'hs_code' | 'importer' | 'exporter';

const categoryToDbType: Record<SearchCategory, DBSearchType> = {
  bl: 'bl',
  product: 'product',
  hscode: 'hs_code',
  importer: 'importer',
  exporter: 'exporter',
};

const dbTypeToCategoryMap: Record<DBSearchType, SearchCategory> = {
  bl: 'bl',
  product: 'product',
  hs_code: 'hscode',
  importer: 'importer',
  exporter: 'exporter',
};

export interface BLSearchHistoryItem {
  id: string;
  user_id: string;
  created_at: string;
  search_type: SearchCategory;
  keyword: string;
  date_from: string | null;
  date_to: string | null;
  filters_json: SearchFilter[];
  query_hash: string;
  last_opened_at: string;
  result_total_count: number;
  last_viewed_page: number;
  viewed_row_ids: string[];
}

interface SaveSearchParams {
  searchType: SearchCategory;
  keyword: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  filters: SearchFilter[];
  resultCount: number;
}

// Generate a hash for the search query
function generateQueryHash(params: SaveSearchParams): string {
  const hashInput = JSON.stringify({
    type: params.searchType,
    keyword: params.keyword.trim().toLowerCase(),
    dateFrom: params.dateFrom?.toISOString().split('T')[0],
    dateTo: params.dateTo?.toISOString().split('T')[0],
    filters: params.filters
      .filter(f => f.value.trim())
      .map(f => ({ type: f.type, value: f.value.trim().toLowerCase() }))
      .sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value)),
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function parseFiltersJson(json: unknown): SearchFilter[] {
  if (Array.isArray(json)) {
    return json as SearchFilter[];
  }
  return [];
}

function parseViewedRowIds(json: unknown): string[] {
  if (Array.isArray(json)) {
    return json as string[];
  }
  return [];
}

export function useBLSearchHistory() {
  const { user } = useAuthContext();
  const [history, setHistory] = useState<BLSearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch recent search history
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bl_search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('last_opened_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setHistory((data || []).map(item => ({
        ...item,
        search_type: dbTypeToCategoryMap[item.search_type as DBSearchType] || 'product',
        filters_json: parseFiltersJson(item.filters_json),
        viewed_row_ids: parseViewedRowIds(item.viewed_row_ids),
      })));
    } catch (error) {
      console.error('Error fetching search history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Save or update search history
  const saveSearch = useCallback(async (params: SaveSearchParams): Promise<BLSearchHistoryItem | null> => {
    if (!user) return null;

    const queryHash = generateQueryHash(params);
    const dbSearchType = categoryToDbType[params.searchType];

    try {
      // Check if this query already exists
      const { data: existing } = await supabase
        .from('bl_search_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('query_hash', queryHash)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('bl_search_history')
          .update({
            last_opened_at: new Date().toISOString(),
            result_total_count: params.resultCount,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        
        await fetchHistory();
        return {
          ...data,
          search_type: dbTypeToCategoryMap[data.search_type as DBSearchType] || 'product',
          filters_json: parseFiltersJson(data.filters_json),
          viewed_row_ids: parseViewedRowIds(data.viewed_row_ids),
        };
      } else {
        // Insert new record
        const insertData = {
          user_id: user.id,
          search_type: dbSearchType,
          keyword: params.keyword,
          date_from: params.dateFrom?.toISOString().split('T')[0] || null,
          date_to: params.dateTo?.toISOString().split('T')[0] || null,
          filters_json: params.filters.filter(f => f.value.trim()) as unknown,
          query_hash: queryHash,
          result_total_count: params.resultCount,
          viewed_row_ids: [] as unknown,
        };
        
        const { data, error } = await supabase
          .from('bl_search_history')
          .insert(insertData as never)
          .select()
          .single();

        if (error) throw error;

        await fetchHistory();
        return {
          ...data,
          search_type: dbTypeToCategoryMap[data.search_type as DBSearchType] || 'product',
          filters_json: parseFiltersJson(data.filters_json),
          viewed_row_ids: parseViewedRowIds(data.viewed_row_ids),
        };
      }
    } catch (error) {
      console.error('Error saving search history:', error);
      return null;
    }
  }, [user, fetchHistory]);

  // Get history item by ID
  const getHistoryById = useCallback(async (id: string): Promise<BLSearchHistoryItem | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('bl_search_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Update last_opened_at
      await supabase
        .from('bl_search_history')
        .update({ last_opened_at: new Date().toISOString() })
        .eq('id', id);

      return {
        ...data,
        search_type: dbTypeToCategoryMap[data.search_type as DBSearchType] || 'product',
        filters_json: parseFiltersJson(data.filters_json),
        viewed_row_ids: parseViewedRowIds(data.viewed_row_ids),
      };
    } catch (error) {
      console.error('Error fetching history item:', error);
      return null;
    }
  }, [user]);

  // Update viewed row IDs for a history item
  const updateViewedRows = useCallback(async (historyId: string, newRowIds: string[]): Promise<void> => {
    if (!user) return;

    try {
      // Get current viewed rows
      const { data: current } = await supabase
        .from('bl_search_history')
        .select('viewed_row_ids')
        .eq('id', historyId)
        .single();

      const existingIds = parseViewedRowIds(current?.viewed_row_ids);
      const mergedIds = [...new Set([...existingIds, ...newRowIds])];

      await supabase
        .from('bl_search_history')
        .update({
          viewed_row_ids: mergedIds,
          last_opened_at: new Date().toISOString(),
        })
        .eq('id', historyId);
    } catch (error) {
      console.error('Error updating viewed rows:', error);
    }
  }, [user]);

  // Update last viewed page
  const updateLastViewedPage = useCallback(async (historyId: string, page: number): Promise<void> => {
    if (!user) return;

    try {
      await supabase
        .from('bl_search_history')
        .update({
          last_viewed_page: page,
          last_opened_at: new Date().toISOString(),
        })
        .eq('id', historyId);
    } catch (error) {
      console.error('Error updating last viewed page:', error);
    }
  }, [user]);

  // Get search type label
  const getSearchTypeLabel = (type: SearchCategory): string => {
    const labels: Record<SearchCategory, string> = {
      bl: 'B/L 번호',
      product: '제품',
      hscode: 'HS코드',
      importer: '수입업체',
      exporter: '수출업체',
    };
    return labels[type] || type;
  };

  return {
    history,
    isLoading,
    fetchHistory,
    saveSearch,
    getHistoryById,
    updateViewedRows,
    updateLastViewedPage,
    getSearchTypeLabel,
  };
}
