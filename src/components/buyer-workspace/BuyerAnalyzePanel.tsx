import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Loader2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Buyer } from '@/data/mockData';
import { useBuyerAnalysis } from '@/hooks/useBuyerAnalysis';
import { useSalesActivityLogs, SalesActivityLog } from '@/hooks/useSalesActivityLogs';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BuyerAnalyzePanelProps {
  buyer: Buyer;
}

const BuyerAnalyzePanel: React.FC<BuyerAnalyzePanelProps> = ({ buyer }) => {
  const { analyzeBuyer, isAnalyzing } = useBuyerAnalysis();
  const { logs, fetchLogsByBuyer } = useSalesActivityLogs();
  const [latestAnalysis, setLatestAnalysis] = useState<SalesActivityLog | null>(null);

  // Fetch and find latest analysis
  const refreshAnalysis = useCallback(async () => {
    await fetchLogsByBuyer(buyer.id);
  }, [buyer.id, fetchLogsByBuyer]);

  useEffect(() => {
    refreshAnalysis();
  }, [refreshAnalysis]);

  // Find latest AI analysis from logs
  useEffect(() => {
    const analysisLogs = logs.filter(log => log.source === 'ai_analysis');
    if (analysisLogs.length > 0) {
      setLatestAnalysis(analysisLogs[0]); // Already sorted by occurred_at desc
    } else {
      setLatestAnalysis(null);
    }
  }, [logs]);

  const handleRunAnalysis = async () => {
    if (!buyer.name || buyer.name.trim() === '') {
      toast({
        variant: 'destructive',
        title: '분석 불가',
        description: '회사명을 입력해주세요.',
      });
      return;
    }

    const result = await analyzeBuyer(
      buyer.id,
      buyer.name,
      buyer.websiteUrl,
      buyer.country,
      buyer.mainProducts
    );

    if (result.success && result.analysis) {
      toast({
        title: '바이어 분석 완료',
        description: '분석 결과가 저장되었습니다.',
      });
      // Refresh to get the new analysis
      await refreshAnalysis();
    } else {
      toast({
        variant: 'destructive',
        title: '바이어 분석 실패',
        description: result.error || '알 수 없는 오류가 발생했습니다.',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Buyer Analyze</h3>
            <p className="text-sm text-muted-foreground">
              AI가 바이어를 분석하여 우리 회사 제품과의 적합성을 평가합니다
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Buyer Analyze
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {latestAnalysis ? (
            <div className="space-y-4">
              {/* Analysis metadata */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Last analyzed: {format(new Date(latestAnalysis.occurred_at), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>

              {/* Analysis content */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                  {latestAnalysis.content || '분석 결과가 없습니다.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h4 className="text-lg font-medium text-foreground mb-2">
                아직 분석 결과가 없습니다
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                "Run Buyer Analyze" 버튼을 클릭하여 AI 분석을 시작하세요
              </p>
              <Button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                variant="outline"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    분석 중...
                  </>
                ) : (
                  'Run Buyer Analyze'
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BuyerAnalyzePanel;
