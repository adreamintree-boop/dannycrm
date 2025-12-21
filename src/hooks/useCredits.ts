import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

interface UseCreditsReturn {
  balance: number;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
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

  const deductBLSearchCredits = useCallback(async (
    resultCount: number,
    searchMeta: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const requestId = crypto.randomUUID();

    try {
      const { data, error } = await supabase.functions.invoke('bl-search', {
        body: {
          request_id: requestId,
          result_count: resultCount,
          search_meta: searchMeta,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Check if it's a credit error (402)
        const errorData = error.message ? JSON.parse(error.message) : {};
        return { 
          success: false, 
          error: errorData.error || '크레딧 처리 중 오류가 발생했습니다.',
          newBalance: errorData.balance
        };
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
      console.error('BL Search credit error:', error);
      return { success: false, error: '크레딧 처리 중 오류가 발생했습니다.' };
    }
  }, [session?.access_token]);

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
        const errorData = error.message ? JSON.parse(error.message) : {};
        return { 
          success: false, 
          error: errorData.error || '크레딧 처리 중 오류가 발생했습니다.',
          newBalance: errorData.balance
        };
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
    deductBLSearchCredits,
    deductStrategyCredits,
  };
}
