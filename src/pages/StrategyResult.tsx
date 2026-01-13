import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, Check, Sparkles, AlertCircle, Clock, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import TopHeader from '@/components/layout/TopHeader';
import { useCompanySurvey } from '@/hooks/useCompanySurvey';
import { useCreditsContext } from '@/context/CreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionData {
  status: 'pending' | 'generating' | 'completed' | 'error';
  content: string | null;
  title: string;
}

interface StrategyReport {
  id: string;
  content: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  summary_markdown: string | null;
  sections: Record<string, SectionData>;
  report_json?: {
    report_markdown?: string;
    summary_json?: any;
  };
  product_name: string | null;
  target_regions: string[] | null;
  created_at: string;
}

const SECTION_TITLES = [
  '기업 개요 및 제품 포지셔닝',
  '글로벌 시장 동향 및 수출 가능성 진단',
  '주요 경쟁사 및 대체재 분석',
  '목표 수출 시장 및 진입 논리',
  'HS CODE 및 수입 구조 분석',
  '국가별 진입 장벽 및 리스크 요인',
  '유통 구조 및 잠재 바이어 유형',
  '수출 전략 및 단계별 실행 제안'
];

const StrategyResult: React.FC = () => {
  const navigate = useNavigate();
  const { survey, isLoading: surveyLoading, hasSurvey } = useCompanySurvey();
  const { refreshBalance, balance } = useCreditsContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<StrategyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  
  // Progressive generation state
  const [currentReport, setCurrentReport] = useState<StrategyReport | null>(null);
  const [sectionStatus, setSectionStatus] = useState<Record<number, 'pending' | 'generating' | 'completed' | 'error'>>({});
  const [surveyContext, setSurveyContext] = useState<any>(null);

  // Fetch saved reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('strategy_reports')
          .select('id, content, status, summary_markdown, sections, report_json, product_name, target_regions, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const typedData = (data || []).map(r => ({
          ...r,
          status: r.status as StrategyReport['status'],
          sections: (r.sections as unknown as Record<string, SectionData>) || {},
          report_json: r.report_json as StrategyReport['report_json']
        }));

        setSavedReports(typedData);
        
        // If there are reports, show the most recent one
        if (typedData.length > 0) {
          setSelectedReportId(typedData[0].id);
          setCurrentReport(typedData[0]);
          
          // If report is still generating, resume polling
          if (typedData[0].status === 'generating') {
            // Set section statuses from saved data
            const sections = typedData[0].sections || {};
            const statuses: Record<number, 'pending' | 'generating' | 'completed' | 'error'> = {};
            for (let i = 1; i <= 8; i++) {
              const sec = sections[`section${i}`];
              statuses[i] = sec?.status || 'pending';
            }
            setSectionStatus(statuses);
          }
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, []);

  const generateSection = useCallback(async (reportId: string, sectionNumber: number, context: any) => {
    setSectionStatus(prev => ({ ...prev, [sectionNumber]: 'generating' }));
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-strategy-section', {
        body: {
          report_id: reportId,
          section_number: sectionNumber,
          survey_context: context
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setSectionStatus(prev => ({ ...prev, [sectionNumber]: 'completed' }));
      
      // Update current report sections
      setCurrentReport(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [`section${sectionNumber}`]: {
              status: 'completed',
              content: data.section_content,
              title: SECTION_TITLES[sectionNumber - 1]
            }
          }
        };
      });

      return data;
    } catch (err) {
      console.error(`Error generating section ${sectionNumber}:`, err);
      setSectionStatus(prev => ({ ...prev, [sectionNumber]: 'error' }));
      return null;
    }
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
    setSectionStatus({});

    try {
      const requestId = crypto.randomUUID();
      
      // Step 1: Generate summary and create report
      const { data, error: fnError } = await supabase.functions.invoke('generate-strategy-summary', {
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
            catalog_file_url: survey.catalog_file_url,
            intro_file_url: survey.intro_file_url,
          },
        },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        if (data.refunded) {
          toast({
            variant: 'destructive',
            title: '오류 발생',
            description: `${data.error} (크레딧이 환불되었습니다)`,
          });
        }
        throw new Error(data.error);
      }

      const reportId = data.report_id;
      const context = data.survey_context;
      setSurveyContext(context);

      // Initialize current report with summary
      const initialReport: StrategyReport = {
        id: reportId,
        content: '',
        status: 'generating',
        summary_markdown: data.summary_markdown,
        sections: {},
        product_name: survey.products?.[0]?.product_name || null,
        target_regions: survey.target_regions || null,
        created_at: new Date().toISOString()
      };
      
      setCurrentReport(initialReport);
      setSelectedReportId(reportId);

      // Initialize all sections as pending
      const initialStatuses: Record<number, 'pending' | 'generating' | 'completed' | 'error'> = {};
      for (let i = 1; i <= 8; i++) {
        initialStatuses[i] = 'pending';
      }
      setSectionStatus(initialStatuses);

      await refreshBalance();
      
      toast({
        title: '요약 생성 완료',
        description: '섹션별 분석을 생성 중입니다...',
      });

      // Step 2: Generate sections sequentially (but show progress)
      for (let i = 1; i <= 8; i++) {
        await generateSection(reportId, i, context);
      }

      // Refresh reports list
      const { data: newReports } = await supabase
        .from('strategy_reports')
        .select('id, content, status, summary_markdown, sections, report_json, product_name, target_regions, created_at')
        .order('created_at', { ascending: false });
      
      if (newReports) {
        const typedNewReports = newReports.map(r => ({
          ...r,
          status: r.status as StrategyReport['status'],
          sections: (r.sections as unknown as Record<string, SectionData>) || {},
          report_json: r.report_json as StrategyReport['report_json']
        }));
        setSavedReports(typedNewReports);
        
        // Update current report with final data
        const finalReport = typedNewReports.find(r => r.id === reportId);
        if (finalReport) {
          setCurrentReport(finalReport);
        }
      }
      
      toast({
        title: '시장조사 완료',
        description: `10 크레딧이 차감되었습니다.`,
      });

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

  const handleRetrySection = async (sectionNumber: number) => {
    if (!currentReport || !surveyContext) return;
    await generateSection(currentReport.id, sectionNumber, surveyContext);
  };

  const handleSelectReport = (report: StrategyReport) => {
    setSelectedReportId(report.id);
    setCurrentReport(report);
    
    // Set section statuses from saved data
    const sections = report.sections || {};
    const statuses: Record<number, 'pending' | 'generating' | 'completed' | 'error'> = {};
    for (let i = 1; i <= 8; i++) {
      const sec = sections[`section${i}`];
      statuses[i] = sec?.status || (report.content ? 'completed' : 'pending');
    }
    setSectionStatus(statuses);
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

      if (selectedReportId === reportId) {
        if (updatedReports.length > 0) {
          setSelectedReportId(updatedReports[0].id);
          setCurrentReport(updatedReports[0]);
        } else {
          setSelectedReportId(null);
          setCurrentReport(null);
        }
      }

      toast({ title: '삭제 완료', description: '리포트가 삭제되었습니다.' });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({ variant: 'destructive', title: '삭제 실패', description: '리포트 삭제에 실패했습니다.' });
    }
  };

  const handleCopy = async () => {
    if (!currentReport) return;
    
    let content = currentReport.summary_markdown || '';
    for (let i = 1; i <= 8; i++) {
      const sec = currentReport.sections?.[`section${i}`];
      if (sec?.content) {
        content += '\n\n' + sec.content;
      }
    }
    
    try {
      await navigator.clipboard.writeText(content || currentReport.content);
      setCopied(true);
      toast({ title: '복사 완료', description: '클립보드에 복사되었습니다.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: '복사 실패', description: '복사에 실패했습니다.' });
    }
  };

  const renderMarkdown = (content: string) => {
    return content
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 text-foreground">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-8 mb-4 text-foreground border-b border-border pb-2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-6 mb-3 text-foreground">$1</h3>')
      .replace(/^---$/gm, '<hr class="my-6 border-border" />')
      .replace(/^\* (.+)$/gm, '<p class="text-sm text-muted-foreground italic my-2">$1</p>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-foreground">$1</li>')
      .replace(/(<li.*<\/li>\n)+/g, (match) => `<ul class="list-disc pl-4 my-2">${match}</ul>`)
      .replace(/^\d+\) (.+)$/gm, '<li class="ml-4 text-foreground list-decimal">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br />');
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

  // No reports yet - show initial state with generate button
  if (savedReports.length === 0 && !currentReport) {
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
              <h3 className="font-medium text-foreground mb-2">분석 내용 (8개 섹션)</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {SECTION_TITLES.map((title, idx) => (
                  <li key={idx}>• {title}</li>
                ))}
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
                disabled={isGenerating}
                className="w-full max-w-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    시장조사 시작하기
                  </>
                )}
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

  // Has reports or generating - show list and content
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
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  새 시장조사 (10 크레딧)
                </>
              )}
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {report.product_name || '수출 시장조사'}
                        </p>
                        {report.status === 'generating' && (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        )}
                      </div>
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
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">수출 시장 적합성 분석 리포트</h1>
                  <p className="text-sm text-muted-foreground">
                    {currentReport?.product_name || survey.products?.[0]?.product_name || 'Company'} - Grok AI 분석
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleCopy} disabled={!currentReport}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            {/* Progressive Content */}
            {currentReport ? (
              <div className="space-y-6">
                {/* Executive Summary */}
                {currentReport.summary_markdown ? (
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentReport.summary_markdown) }}
                    />
                  </div>
                ) : currentReport.status === 'generating' ? (
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : null}

                {/* Section Cards */}
                {SECTION_TITLES.map((title, idx) => {
                  const sectionNum = idx + 1;
                  const section = currentReport.sections?.[`section${sectionNum}`];
                  const status = sectionStatus[sectionNum] || section?.status || 'pending';
                  
                  return (
                    <div 
                      key={sectionNum}
                      className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
                    >
                      {/* Section header */}
                      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                        <h3 className="font-semibold text-foreground">
                          {sectionNum}. {title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {status === 'generating' && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              생성 중...
                            </div>
                          )}
                          {status === 'completed' && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                          {status === 'error' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRetrySection(sectionNum)}
                              className="text-destructive hover:text-destructive"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              재시도
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Section content */}
                      <div className="p-6">
                        {status === 'completed' && section?.content ? (
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                          />
                        ) : status === 'generating' ? (
                          <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-5/6" />
                          </div>
                        ) : status === 'error' ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">섹션 생성에 실패했습니다. 재시도 버튼을 클릭하세요.</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-sm">
                            대기 중...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Legacy content for old reports */}
                {currentReport.content && !currentReport.sections?.section1?.content && (
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentReport.content) }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                리포트를 선택해주세요.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default StrategyResult;
