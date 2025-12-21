import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

interface UseCreditsReturn {
  balance: number;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  chargeBLSearchPage: (
    searchKey: string,
    rowFingerprints: string[],
    pageNumber: number,
    searchMeta: Record<string, unknown>
  ) => Promise<{ success: boolean; newBalance?: number; chargedCount?: number; error?: string }>;
  deductBLSearchCredits: (resultCount: number, searchMeta: Record<string, unknown>) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
  deductStrategyCredits: (strategyMeta: Record<string, unknown>) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
}

export function useCredits(): UseCreditsReturn {
  const { session, isAuthenticated } = useAuthContext();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBalance = useCallback(async () => {
    if (!session?.access_token) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-credits', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Failed to fetch credits:', error);
        return;
      }

      setBalance(data?.balance ?? 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance();
    } else {
      setBalance(0);
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshBalance]);

  // Page-based credit charging for B/L Search
  const chargeBLSearchPage = useCallback(async (
    searchKey: string,
    rowFingerprints: string[],
    pageNumber: number,
    searchMeta: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance?: number; chargedCount?: number; error?: string }> => {
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    // If no rows to charge, just return success
    if (rowFingerprints.length === 0) {
      return { success: true, newBalance: balance, chargedCount: 0 };
    }

    const requestId = crypto.randomUUID();

    try {
      const { data, error } = await supabase.functions.invoke('bl-search', {
        body: {
          request_id: requestId,
          search_key: searchKey,
          row_fingerprints: rowFingerprints,
          page_number: pageNumber,
          search_meta: searchMeta,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('BL Search page credit error:', error);
        try {
          const errorData = JSON.parse(error.message);
          return { 
            success: false, 
            error: errorData.error || '크레딧 처리 중 오류가 발생했습니다.',
            newBalance: errorData.balance
          };
        } catch {
          return { success: false, error: '크레딧 처리 중 오류가 발생했습니다.' };
        }
      }

      if (data?.success) {
        setBalance(data.new_balance);
        return { 
          success: true, 
          newBalance: data.new_balance,
          chargedCount: data.charged_count
        };
      }

      return { 
        success: false, 
        error: data?.error || '크레딧 처리 중 오류가 발생했습니다.',
        newBalance: data?.balance
      };
    } catch (error) {
      console.error('BL Search page credit error:', error);
      return { success: false, error: '크레딧 처리 중 오류가 발생했습니다.' };
    }
  }, [session?.access_token, balance]);

  // Legacy method - now a no-op since we charge per page
  const deductBLSearchCredits = useCallback(async (
    _resultCount: number,
    _searchMeta: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
    // This is now a no-op as we charge per page view
    // Just return success to allow the search to proceed
    return { success: true, newBalance: balance };
  }, [balance]);

  const deductStrategyCredits = useCallback(async (
    strategyMeta: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const requestId = crypto.randomUUID();

    try {
      const { data, error } = await supabase.functions.invoke('strategy-credits', {
        body: {
          request_id: requestId,
          strategy_meta: strategyMeta,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        try {
          const errorData = JSON.parse(error.message);
          return { 
            success: false, 
            error: errorData.error || '크레딧 처리 중 오류가 발생했습니다.',
            newBalance: errorData.balance
          };
        } catch {
          return { success: false, error: '크레딧 처리 중 오류가 발생했습니다.' };
        }
      }

      if (data?.success) {
        setBalance(data.new_balance);
        return { success: true, newBalance: data.new_balance };
      }

      return { 
        success: false, 
        error: data?.error || '크레딧 처리 중 오류가 발생했습니다.',
        newBalance: data?.balance
      };
    } catch (error) {
      console.error('Strategy credit error:', error);
      return { success: false, error: '크레딧 처리 중 오류가 발생했습니다.' };
    }
  }, [session?.access_token]);

  return {
    balance,
    isLoading,
    refreshBalance,
    chargeBLSearchPage,
    deductBLSearchCredits,
    deductStrategyCredits,
  };
}
