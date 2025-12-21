import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import TopHeader from '@/components/layout/TopHeader';
import { useCompanySurvey, CompanySurvey } from '@/hooks/useCompanySurvey';
import { useCreditsContext } from '@/context/CreditsContext';

// Mock AI strategy generator (placeholder for future AI integration)
function generateMockStrategy(survey: CompanySurvey): string {
  const productList = survey.products
    .filter(p => p.product_name.trim())
    .map(p => `- ${p.product_name}: ${p.product_description || 'N/A'}`)
    .join('\n');

  const regionMap: Record<string, string> = {
    north_america: '북미',
    europe: '유럽',
    southeast_asia: '동남아시아',
    middle_east: '중동',
    east_asia: '동아시아',
    others: '기타 지역',
  };

  const targetRegions = survey.target_regions
    .map(r => regionMap[r] || r)
    .join(', ') || '미정';

  return `
# 수출 전략 분석 리포트

---

## 1. 제품 개요 및 수출 가능성 진단

### 주요 제품군:
${productList || '- 등록된 제품 없음'}

### 기술적·제품적 강점:
${survey.core_strengths ? survey.core_strengths.split(',').map(s => `- ${s.trim()}`).join('\n') : '- 정보 미입력'}

### 수출 가능성 진단:
- 현재 수출 경험: ${survey.export_experience === 'direct' ? '직접 수출 경험 있음' : survey.export_experience === 'indirect' ? '간접 수출 경험 있음' : '수출 경험 없음'}
- 기존 수출 시장: ${survey.existing_markets.length > 0 ? survey.existing_markets.join(', ') : '없음'}
- 보유 인증: ${survey.certifications.length > 0 ? survey.certifications.join(', ') : '없음'}
- 글로벌 시장 진입을 위한 기본 요건을 갖추고 있으며, 타겟 시장에 맞는 추가 인증 취득 검토 필요

---

## 2. 경쟁사 관련 정보 (추정 포함 가능)

| 기업명 | 국가 | 주요 제품 | 비고 |
|--------|------|-----------|------|
| Company A | 미국 | 유사 제품군 | 시장 선도 기업 |
| Company B | 독일 | 프리미엄 제품 | 기술력 우수 |
| Company C | 일본 | 가격 경쟁 제품 | 아시아 시장 강점 |

*실제 경쟁사 분석은 AI 연동 후 제공됩니다.*

---

## 3. 목표 수출 시장 개요

| 지역 | 특징 | 비고 |
|------|------|------|
| ${targetRegions} | 주요 타겟 시장 | 우선 진출 권장 |

*세부 시장 분석은 AI 연동 후 제공됩니다.*

---

## 4. 수입 통계 및 HS CODE 분석

### 제품군별 추정 HS CODE:
- ${survey.products[0]?.product_name || '주력 제품'}: HS CODE 추정 필요 *(AI 분석 예정)*

### 주요국 수입 통계 (최근 3년, USD):
| 국가 | 2022 | 2023 | 2024 |
|------|------|------|------|
| 미국 | - | - | - |
| 독일 | - | - | - |
| 일본 | - | - | - |

*실제 데이터는 AI 연동 후 제공됩니다.*

---

## 5. 진입 장벽 및 리스크 요소

### 국가별 분석:
- **인증 및 규제**: 타겟 시장별 필수 인증 확인 필요 (FDA, CE 등)
- **기술/가격 장벽**: 현지 경쟁 제품 대비 가격 경쟁력 분석 필요
- **현지 시장 특성**: 유통 구조 및 바이어 선호도 파악 필요

---

## 6. 현지 유통 구조 및 유통 채널 분석

### 유통 방식:
- 직접 공급 vs 현지 유통상 활용 검토
- 권장: 초기에는 현지 유통상 파트너십 구축

### 바이어 발굴 경로:
- 전시회 참가 (해외 바이어 접점)
- B2B 플랫폼 활용
- 현지 에이전트 네트워크

---

## 7. 잠재 바이어 유형 제안 (기업명 생략)

| 바이어 유형 | 설명 |
|-------------|------|
| 대형 유통업체 | 물량 확보, 장기 계약 가능 |
| 온라인 셀러 | 소량 다품종, 빠른 피드백 |
| 현지 제조사 | OEM/ODM 협력 가능 |
| 수입 에이전트 | 시장 진입 초기 적합 |

---

## 8. 마케팅·세일즈 전략 제안

### 차별화 포인트:
${survey.core_strengths ? `- ${survey.core_strengths}` : '- 제품 강점 분석 필요'}

### 추천 전시회 및 세일즈 채널:
- 타겟 시장 관련 주요 전시회 참가 검토
- 온라인 B2B 플랫폼 (Alibaba, TradeKorea 등) 활용
- 직접 바이어 접촉 캠페인

### 타겟 아웃리치 전략:
- 단계적 시장 진출 (1차 타겟 → 확장)
- 샘플 제공 및 파일럿 주문 유도

---

## 9. 요약 및 제안

### 핵심 경쟁력 요약:
- 제품 강점: ${survey.core_strengths || '분석 필요'}
- 인증 보유: ${survey.certifications.join(', ') || '없음'}
- 수출 경험: ${survey.export_experience || '없음'}

### 수출 전략 방향 제안:
1. ${targetRegions} 시장 우선 진출
2. 필수 인증 취득 및 현지화 준비
3. 전시회 및 B2B 플랫폼을 통한 바이어 발굴
4. 현지 파트너(에이전트/유통상) 네트워크 구축

---

*본 리포트는 AI 분석 연동 전 샘플 리포트입니다. 실제 AI 분석 시 더 상세한 데이터가 제공됩니다.*
`;
}

const StrategyResult: React.FC = () => {
  const navigate = useNavigate();
  const { survey, isLoading, hasSurvey } = useCompanySurvey();
  const { deductStrategyCredits, refreshBalance, balance } = useCreditsContext();
  const [strategyContent, setStrategyContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const hasDeductedCredits = useRef(false);

  useEffect(() => {
    const generateStrategy = async () => {
      if (isLoading || !hasSurvey || hasDeductedCredits.current) return;
      
      hasDeductedCredits.current = true;
      setIsGenerating(true);
      setCreditError(null);

      // Deduct credits first
      const strategyMeta = {
        product_name: survey.products[0]?.product_name || 'Unknown',
        target_regions: survey.target_regions,
        export_experience: survey.export_experience,
      };

      const creditResult = await deductStrategyCredits(strategyMeta);

      if (!creditResult.success) {
        setCreditError(creditResult.error || '크레딧이 부족합니다. (필요: 10)');
        toast({
          variant: 'destructive',
          title: '크레딧 부족',
          description: creditResult.error || '크레딧이 부족합니다. (필요: 10)',
        });
        setIsGenerating(false);
        return;
      }

      // Refresh balance after deduction
      await refreshBalance();

      // Generate strategy after successful credit deduction
      const timer = setTimeout(() => {
        const content = generateMockStrategy(survey);
        setStrategyContent(content);
        setIsGenerating(false);
      }, 1500);

      return () => clearTimeout(timer);
    };

    generateStrategy();
  }, [isLoading, hasSurvey, survey, deductStrategyCredits, refreshBalance]);

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
              Strategy 분석을 실행하려면 먼저 Onboarding Survey를 작성해주세요.
            </p>
            <Button onClick={() => navigate('/onboarding-survey')}>
              Onboarding Survey 작성하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (creditError) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <FileText className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">크레딧 부족</h2>
            <p className="text-muted-foreground mb-2">
              {creditError}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              현재 보유 크레딧: {balance}
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Strategy Report</h1>
                <p className="text-sm text-muted-foreground">
                  {survey.products[0]?.product_name || 'Company'} 수출 전략 분석
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleCopy} disabled={isGenerating}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* Content */}
          {isGenerating ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">AI 전략 분석 중...</p>
              </div>
            </div>
          ) : (
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
                      const isHeader = cells.every(c => c.includes('---') || !c.includes('-'));
                      if (cells.every(c => c.match(/^-+$/))) return '';
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
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyResult;
