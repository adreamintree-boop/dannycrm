import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { useCreditsContext } from '@/context/CreditsContext';
import { toast } from '@/hooks/use-toast';

export interface EnrichedData {
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
    country?: number;
    address?: number;
    website?: number;
    phone?: number;
    email?: number;
    facebook_url?: number;
    linkedin_url?: number;
    youtube_url?: number;
  };
}

export interface BuyerHints {
  website?: string;
  hs_code?: string;
  product_desc?: string;
  sourceCountryFromBL?: boolean;
}

export interface ExistingFields {
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
}

export interface EnrichmentResult {
  success: boolean;
  enrichedData?: EnrichedData;
  newBalance?: number;
  error?: string;
  requestId?: string;
}

const ENRICH_CREDIT_COST = 5;

export function useBuyerEnrichment() {
  const { session } = useAuthContext();
  const { balance, refreshBalance } = useCreditsContext();
  const [isLoading, setIsLoading] = useState(false);

  const canEnrich = (balance ?? 0) >= ENRICH_CREDIT_COST;

  const enrichBuyer = useCallback(async (
    buyerId: string,
    buyerName: string,
    buyerCountry?: string,
    existingFields?: ExistingFields,
    hints?: BuyerHints
  ): Promise<EnrichmentResult> => {
    if (!session?.access_token) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    if ((balance ?? 0) < ENRICH_CREDIT_COST) {
      toast({
        variant: 'destructive',
        title: '크레딧 부족',
        description: `크레딧이 부족합니다.`,
      });
      return { success: false, error: '크레딧 부족' };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', {
        body: {
          buyerId,
          buyerName,
          buyerCountry,
          existingFields,
          hints,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Enrich buyer error:', error);
        toast({
          variant: 'destructive',
          title: '오류',
          description: 'AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
        });
        return { success: false, error: error.message };
      }

      if (data?.error) {
        console.error('Enrich buyer API error:', data.error);
        
        if (data.error.includes('크레딧')) {
          toast({
            variant: 'destructive',
            title: '크레딧 부족',
            description: data.error,
          });
        } else {
          toast({
            variant: 'destructive',
            title: '오류',
            description: 'AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
        
        return { 
          success: false, 
          error: data.error,
          requestId: data.requestId,
        };
      }

      if (data?.success) {
        await refreshBalance();
        return {
          success: true,
          enrichedData: data.enrichedData,
          newBalance: data.newBalance,
          requestId: data.requestId,
        };
      }

      return { success: false, error: 'Unknown error' };
    } catch (err) {
      console.error('Enrich buyer exception:', err);
      toast({
        variant: 'destructive',
        title: '오류',
        description: 'AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
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
    currentBalance: balance,
  };
}
