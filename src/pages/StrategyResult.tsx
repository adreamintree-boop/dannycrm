import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, Check, Sparkles, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import TopHeader from '@/components/layout/TopHeader';
import { useCompanySurvey } from '@/hooks/useCompanySurvey';
import { useCreditsContext } from '@/context/CreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StrategyReport {
  id: string;
  content: string;
  product_name: string | null;
  target_regions: string[] | null;
  created_at: string;
}

const StrategyResult: React.FC = () => {
  const navigate = useNavigate();
  const { survey, isLoading: surveyLoading, hasSurvey } = useCompanySurvey();
  const { refreshBalance, balance } = useCreditsContext();
  const [strategyContent, setStrategyContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<StrategyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Fetch saved reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('strategy_reports')
          .select('id, content, product_name, target_regions, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedReports(data || []);
        
        // If there are reports, show the most recent one
        if (data && data.length > 0) {
          setSelectedReportId(data[0].id);
          setStrategyContent(data[0].content);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, []);

  const handleGenerateStrategy = async () => {
    if (balance !== null && balance < 10) {
      toast({
        variant: 'destructive',
        title: '크레딧 부족',
        description: `크레딧이 부족합니다. (필요: 10, 보유: ${balance})`,
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const requestId = crypto.randomUUID();
      
      const { data, error: fnError } = await supabase.functions.invoke('generate-strategy', {
        body: {
          request_id: requestId,
          survey_data: {
            id: survey.id,
            company_website: survey.company_website,
            company_description: survey.company_description,
            year_founded: survey.year_founded,
            employee_count: survey.employee_count,
            core_strengths: survey.core_strengths,
            export_experience: survey.export_experience,
            existing_markets: survey.existing_markets,
            certifications: survey.certifications,
            target_regions: survey.target_regions,
            products: survey.products,
          },
        },
      });

      if (fnError) {
        console.error('Strategy generation error:', fnError);
        throw new Error(fnError.message || '시장조사 생성 중 오류가 발생했습니다.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.strategy) {
        setStrategyContent(data.strategy);
        setSelectedReportId(data.report_id || null);
        
        // Refresh reports list
        const { data: newReports } = await supabase
          .from('strategy_reports')
          .select('id, content, product_name, target_regions, created_at')
          .order('created_at', { ascending: false });
        
        if (newReports) {
          setSavedReports(newReports);
        }
        
        await refreshBalance();
        
        toast({
          title: '시장조사 완료',
          description: `10 크레딧이 차감되었습니다. (잔여: ${data.new_balance})`,
        });
      }
    } catch (err) {
      console.error('Error generating strategy:', err);
      const errorMessage = err instanceof Error ? err.message : '시장조사 생성 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectReport = (report: StrategyReport) => {
    setSelectedReportId(report.id);
    setStrategyContent(report.content);
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('strategy_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      const updatedReports = savedReports.filter(r => r.id !== reportId);
      setSavedReports(updatedReports);

      // If we deleted the currently selected report, select the next one
      if (selectedReportId === reportId) {
        if (updatedReports.length > 0) {
          setSelectedReportId(updatedReports[0].id);
          setStrategyContent(updatedReports[0].content);
        } else {
          setSelectedReportId(null);
          setStrategyContent('');
        }
      }

      toast({ title: '삭제 완료', description: '리포트가 삭제되었습니다.' });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({ variant: 'destructive', title: '삭제 실패', description: '리포트 삭제에 실패했습니다.' });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(strategyContent);
      setCopied(true);
      toast({ title: '복사 완료', description: '클립보드에 복사되었습니다.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: '복사 실패', description: '복사에 실패했습니다.' });
    }
  };

  const isLoading = surveyLoading || isLoadingReports;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasSurvey) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">설문 작성 필요</h2>
            <p className="text-muted-foreground mb-6">
              시장조사를 실행하려면 먼저 Onboarding Survey를 작성해주세요.
            </p>
            <Button onClick={() => navigate('/onboarding-survey')}>
              Onboarding Survey 작성하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Grok AI 수출 적합성 분석 중...</h2>
            <p className="text-muted-foreground">
              잠시만 기다려주세요. 약 30초~1분 정도 소요됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No reports yet - show initial state with generate button
  if (savedReports.length === 0 && !strategyContent) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg p-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">AI 수출 시장 적합성 분석</h2>
            <p className="text-muted-foreground mb-2">
              온보딩 서베이에 입력하신 기업 정보를 바탕으로
            </p>
            <p className="text-muted-foreground mb-6">
              Grok AI가 귀사 제품의 수출 적합성을 분석합니다.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-foreground mb-2">분석 내용</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 제품-시장 적합성 평가</li>
                <li>• 목표 국가 적합성 분석</li>
                <li>• 경쟁 및 무역 신호 분석</li>
                <li>• 수출 준비도 평가</li>
                <li>• 전략적 권고사항 (Go/No-Go 판정)</li>
              </ul>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <Button 
                size="lg" 
                onClick={handleGenerateStrategy}
                className="w-full max-w-xs"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                시장조사 시작하기
              </Button>
              <p className="text-sm text-muted-foreground">
                10 크레딧 소진 (보유: {balance ?? '...'})
              </p>
            </div>

            <Button 
              variant="ghost" 
              className="mt-6"
              onClick={() => navigate('/onboarding-survey')}
            >
              설문 내용 수정하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Has reports - show list and content
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Report list */}
        <div className="w-72 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <Button 
              onClick={handleGenerateStrategy} 
              className="w-full"
              disabled={isGenerating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              새 시장조사 (10 크레딧)
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-1 mb-1">저장된 리포트</p>
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleSelectReport(report)}
                  className={`p-3 rounded-lg cursor-pointer mb-1 group transition-colors ${
                    selectedReportId === report.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {report.product_name || '수출 시장조사'}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(report.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteReport(report.id, e)}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/onboarding-survey')}
            >
              설문 내용 수정하기
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">수출 시장 적합성 분석 리포트</h1>
                  <p className="text-sm text-muted-foreground">
                    {savedReports.find(r => r.id === selectedReportId)?.product_name || survey.products[0]?.product_name || 'Company'} - Grok AI 분석
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            {/* Content */}
            {strategyContent ? (
              <article className="prose prose-sm max-w-none dark:prose-invert">
                <div 
                  className="bg-card border border-border rounded-lg p-8 shadow-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: strategyContent
                      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 text-foreground">$1</h1>')
                      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-8 mb-4 text-foreground border-b border-border pb-2">$1</h2>')
                      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-6 mb-3 text-foreground">$1</h3>')
                      .replace(/^---$/gm, '<hr class="my-6 border-border" />')
                      .replace(/^\| (.+) \|$/gm, (match) => {
                        const cells = match.slice(1, -1).split('|').map(c => c.trim());
                        if (cells.every(c => c.match(/^-+$/))) return '';
                        const isHeader = cells.every(c => !c.includes('-'));
                        const tag = isHeader ? 'th' : 'td';
                        const cellClass = isHeader 
                          ? 'px-4 py-2 text-left font-medium bg-muted' 
                          : 'px-4 py-2 border-t border-border';
                        return `<tr>${cells.map(c => `<${tag} class="${cellClass}">${c}</${tag}>`).join('')}</tr>`;
                      })
                      .replace(/(<tr>.*<\/tr>\n)+/g, (match) => `<table class="w-full border border-border rounded-lg overflow-hidden my-4"><tbody>${match}</tbody></table>`)
                      .replace(/^\* (.+)$/gm, '<p class="text-sm text-muted-foreground italic my-2">$1</p>')
                      .replace(/^- (.+)$/gm, '<li class="ml-4 text-foreground">$1</li>')
                      .replace(/(<li.*<\/li>\n)+/g, (match) => `<ul class="list-disc pl-4 my-2">${match}</ul>`)
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n\n/g, '<br />')
                  }}
                />
              </article>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                리포트를 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyResult;
