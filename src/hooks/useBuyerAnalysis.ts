import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface BuyerAnalysisResult {
  success: boolean;
  analysis?: string;
  activity_log_id?: string;
  error?: string;
}

export function useBuyerAnalysis() {
  const { user } = useAuthContext();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeBuyer = useCallback(async (
    buyerId: string,
    buyerName: string,
    buyerWebsite?: string,
    buyerCountry?: string,
    buyerDescription?: string
  ): Promise<BuyerAnalysisResult> => {
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    setIsAnalyzing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return { success: false, error: '인증 세션이 만료되었습니다.' };
      }

      const response = await supabase.functions.invoke('analyze-buyer', {
        body: {
          buyerId,
          buyerName,
          buyerWebsite,
          buyerCountry,
          buyerDescription,
        },
      });

      if (response.error) {
        console.error('Analyze buyer error:', response.error);
        return { 
          success: false, 
          error: response.error.message || '바이어 분석에 실패했습니다.' 
        };
      }

      const data = response.data;

      if (!data.success) {
        return { 
          success: false, 
          error: data.error || '바이어 분석에 실패했습니다.' 
        };
      }

      return {
        success: true,
        analysis: data.analysis,
        activity_log_id: data.activity_log_id,
      };

    } catch (error) {
      console.error('Analyze buyer error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  return {
    analyzeBuyer,
    isAnalyzing,
  };
}
