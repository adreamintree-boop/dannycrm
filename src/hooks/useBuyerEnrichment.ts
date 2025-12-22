import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { useCreditsContext } from '@/context/CreditsContext';
import { toast } from '@/hooks/use-toast';

interface EnrichedData {
  country?: string;
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  facebook_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  notes?: string;
  confidence?: {
    address?: number;
    website?: number;
    phone?: number;
    email?: number;
  };
}

interface BuyerHints {
  website?: string;
  hs_code?: string;
  product_desc?: string;
}

interface EnrichmentResult {
  success: boolean;
  enrichedData?: EnrichedData;
  newBalance?: number;
  error?: string;
}

export function useBuyerEnrichment() {
  const { session } = useAuthContext();
  const { balance, refreshBalance } = useCreditsContext();
  const [isLoading, setIsLoading] = useState(false);

  const ENRICH_CREDIT_COST = 5;

  const canEnrich = balance >= ENRICH_CREDIT_COST;

  const enrichBuyer = useCallback(async (
    buyerId: string,
    companyName: string,
    country?: string,
    hints?: BuyerHints
  ): Promise<EnrichmentResult> => {
    if (!session?.access_token) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    if (balance < ENRICH_CREDIT_COST) {
      toast({
        variant: 'destructive',
        title: '크레딧 부족',
        description: `잔여 크레딧이 부족합니다 (필요: ${ENRICH_CREDIT_COST}, 보유: ${balance})`,
      });
      return { success: false, error: '크레딧 부족' };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', {
        body: {
          buyer_id: buyerId,
          company_name: companyName,
          country,
          hints,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Enrich buyer error:', error);
        let errorMessage = 'AI 정보 조회 중 오류가 발생했습니다.';
        
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.error || errorMessage;
          if (errorData.refunded) {
            errorMessage += ' (크레딧 환불됨)';
          }
        } catch {
          // Use default message
        }

        toast({
          variant: 'destructive',
          title: '오류',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      }

      if (data?.success) {
        await refreshBalance();
        toast({
          title: 'AI 정보 조회 완료',
          description: `${ENRICH_CREDIT_COST} 크레딧이 차감되었습니다.`,
        });
        return {
          success: true,
          enrichedData: data.enriched_data,
          newBalance: data.new_balance,
        };
      }

      const errorMsg = data?.error || 'Unknown error';
      toast({
        variant: 'destructive',
        title: '오류',
        description: errorMsg,
      });
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('Enrich buyer exception:', err);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '네트워크 오류가 발생했습니다.',
      });
      return { success: false, error: '네트워크 오류' };
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, balance, refreshBalance]);

  return {
    enrichBuyer,
    isLoading,
    canEnrich,
    creditCost: ENRICH_CREDIT_COST,
  };
}
