import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRATEGY_CREDIT_COST = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const grokApiKey = Deno.env.get('TaaS_CRM_Strategy_Test');
    
    if (!grokApiKey) {
      console.error('Missing TaaS_CRM_Strategy_Test secret');
      return new Response(JSON.stringify({ error: 'AI 서비스 설정이 필요합니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { survey_data, request_id } = await req.json();

    if (!request_id) {
      return new Response(JSON.stringify({ error: 'Missing request_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct credits first
    const { data: creditData, error: creditError } = await supabase.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: STRATEGY_CREDIT_COST,
      p_action_type: 'STRATEGY',
      p_request_id: request_id,
      p_meta: { 
        type: 'export_market_analysis',
        product_name: survey_data?.products?.[0]?.product_name || 'Unknown'
      }
    });

    if (creditError) {
      console.error('Deduct credits error:', creditError);
      return new Response(JSON.stringify({ error: 'Failed to process credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creditResult = creditData?.[0];
    
    if (!creditResult?.success) {
      return new Response(JSON.stringify({ 
        error: creditResult?.error_message || '크레딧이 부족합니다. (필요: 10)',
        balance: creditResult?.new_balance || 0,
        required: STRATEGY_CREDIT_COST
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Credits deducted for user ${user.id}: -${STRATEGY_CREDIT_COST}, new balance: ${creditResult.new_balance}`);

    // Build context from survey data
    const regionMap: Record<string, string> = {
      north_america: '북미',
      europe: '유럽',
      southeast_asia: '동남아시아',
      middle_east: '중동',
      east_asia: '동아시아',
      others: '기타 지역',
    };

    const targetRegions = (survey_data.target_regions || [])
      .map((r: string) => regionMap[r] || r)
      .join(', ') || '미정';

    const productList = (survey_data.products || [])
      .filter((p: any) => p.product_name?.trim())
      .map((p: any) => `- ${p.product_name}: ${p.product_description || '설명 없음'}`)
      .join('\n') || '- 등록된 제품 없음';

    const existingMarkets = (survey_data.existing_markets || []).join(', ') || '없음';
    const certifications = (survey_data.certifications || []).join(', ') || '없음';
    
    const exportExpMap: Record<string, string> = {
      'direct': '직접 수출 경험 있음',
      'indirect': '간접 수출 경험 있음',
      'no_experience': '수출 경험 없음',
      '': '수출 경험 없음'
    };
    const exportExperience = exportExpMap[survey_data.export_experience || ''] || survey_data.export_experience || '수출 경험 없음';

    // Grok AI System Prompt - Senior Export Strategy Consultant
    const systemPrompt = `You are a senior export strategy consultant at a global trade advisory firm.

You write paid export strategy reports for manufacturing and B2B companies.
Your reports are used for executive decision-making and investor briefings.

This is NOT a general market overview.
This is a company-specific export feasibility and strategy report.

## Core Principles
- Think like a consultant, not a summarizer.
- When data is missing, infer carefully using industry benchmarks and clearly label assumptions.
- Prefer tables, comparisons, and structured analysis.
- Quantify wherever possible (market size, growth rate, price gap, certification cost, etc.).
- If you say "risk" or "opportunity", explain the mechanism.

You MUST behave as if this report will be reviewed by:
- a CEO
- a trade agency
- an overseas buyer

## ABSOLUTE RULES
- No generic market overviews.
- Every section must answer: "Why does this matter for THIS company?"
- Separate FACTS vs ANALYSIS clearly.
- Use tables whenever possible (markdown table format).
- Use conditional language when appropriate.
- If you reference HS codes, label them as "estimated" unless provided in files.
- If a required fact is missing, do NOT invent it—write: (1) what you need, (2) why it matters, (3) how to obtain it quickly.

## OUTPUT FORMAT (DO NOT SKIP ANY SECTION) - All in Korean

# 수출 전략 리포트

## 0) 요약 (Executive Summary) - 최대 10줄
- **적합성 판정**: Go / 조건부 Go / No-Go
- **상위 3가지 이유**:
  1. [reason 1]
  2. [reason 2]
  3. [reason 3]
- **상위 3가지 리스크**:
  1. [risk 1]
  2. [risk 2]
  3. [risk 3]
- **즉시 실행 단계** (최대 5개):
  1. [step 1]
  2. [step 2]
  ...

---

## 1) 기업 스냅샷 (Company Snapshot) - 사실만
| 항목 | 값 | 신뢰도 (높음/중간/낮음) | 비고 |
|------|-----|------------------------|------|
| 설립연도 | ... | ... | ... |
| 직원 수 | ... | ... | ... |
| 제품 유형 | ... | ... | ... |
| 보유 인증 | ... | ... | ... |
| 기존 시장 | ... | ... | ... |
| 수출 경험 | ... | ... | ... |

---

## 2) 제품 및 적합성 가설 (Product & Fit Hypothesis)

### 사실 (FACTS)
- 설명/카탈로그/소개자료에서 추출한 제품 카테고리 및 용도

### 분석 (ANALYSIS)
| 제품 카테고리 | 대상 바이어 유형 | 수출 적합성 | 필요한 증빙 |
|--------------|-----------------|------------|------------|
| ... | ... | ... | ... |

---

## 3) 목표 국가 후보 (Target Country Shortlist) - 3~5개국

선정 기준: (a) 기존 시장, (b) 보유 인증, (c) 제품 유형, (d) 기업 규모

| 국가 | 선정 이유 | 진입 난이도 | 권장 채널 | 필요 데이터 |
|------|----------|------------|----------|------------|
| ... | ... | ... | ... | ... |

---

## 4) 경쟁 환경 (Competitive Landscape) - 최소 5개 경쟁사

| 경쟁사 | 국가 | 포지셔닝 | 본 기업과의 관련성 | 차별화 방안 |
|--------|------|---------|-------------------|------------|
| ... | ... | ... | ... | ... |

*제품 카테고리가 불명확한 경우, 추정 산업 기반으로 경쟁사를 나열하고 가정 명시*

---

## 5) 인증/규제 및 진입 장벽 (Compliance / Certifications & Barriers)

### 사실 (FACTS)
- 기업이 이미 보유한 인증 목록

### 분석 (ANALYSIS)
| 시장 | 필요 인증/규제 | 보유 현황 | 비용/기간 추정 | 중요도 |
|------|---------------|----------|---------------|--------|
| ... | ... | 보유/미보유 | ... | ... |

---

## 6) 유통 및 영업 채널 (Distribution & Sales Channels)

직원 수와 수출 경험 기반 권장 채널 조합: 직접 B2B / 유통업자 / 에이전트 / 마켓플레이스 / OEM

| 채널 | 본 기업에 대한 장단점 | 첫 번째 추천 행동 | 검증 KPI |
|------|---------------------|------------------|----------|
| ... | ... | ... | ... |

---

## 7) 시장 진입 계획 (Go-to-Market Plan) - 90일

| 기간 | 활동 | 산출물 | 담당자 | 성공 지표 |
|------|------|--------|--------|----------|
| 1-2주차 | ... | ... | ... | ... |
| 3-6주차 | ... | ... | ... | ... |
| 7-12주차 | ... | ... | ... | ... |

---

## 8) 누락 데이터 체크리스트 (Missing Data Checklist)

### P0 - 의사결정 차단 요소
- **필요 정보**: ...
- **필요 이유**: ...
- **빠른 수집 방법**: ...

### P1 - 성공 확률 향상 요소
- ...

### P2 - 있으면 좋은 정보
- ...

---

## Tone & Style
- Professional and analytical
- Concise - no filler content
- No marketing language
- No assumptions without data
- All content in Korean`;

    const userPrompt = `INPUT (Company Survey Data)

- survey_id: ${survey_data.id || 'N/A'}
- user_id: ${user.id}

## Company Identity
- website: ${survey_data.company_website || '(미입력)'}
- description (raw): ${survey_data.company_description || '(미입력)'}
- year_founded: ${survey_data.year_founded || '(미입력)'}
- employee_count: ${survey_data.employee_count || '(미입력)'}

## Business Strengths & Assets
- core_strengths (raw): ${survey_data.core_strengths || '(미입력)'}
- certifications (raw): ${certifications}
- catalog_file (if any): ${survey_data.catalog_file_url || '(없음)'}
- intro_file (if any): ${survey_data.intro_file_url || '(없음)'}

## Export Context
- export_experience (raw): ${exportExperience}
- existing_markets (raw): ${existingMarkets}

## Products
${productList}

## Target Regions
${targetRegions}

---

TASK:
You are a senior export strategy consultant.
Write a company-specific export feasibility and strategy report.

Base the report ONLY on the survey inputs and uploaded files.
If a required fact is missing, do NOT invent it—write:
(1) what you need, (2) why it matters, (3) how to obtain it quickly.

Follow the OUTPUT FORMAT exactly. Do not skip any section.
Write everything in Korean.`;

    console.log('Calling Grok AI for strategy generation...');

    // Call Grok AI API
    const aiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Grok AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        return new Response(JSON.stringify({ error: 'AI 서비스 인증에 실패했습니다.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    console.log('Grok AI response received:', JSON.stringify(aiData).slice(0, 500));

    const strategyContent = aiData.choices?.[0]?.message?.content;

    if (!strategyContent) {
      console.error('No content in AI response:', aiData);
      return new Response(JSON.stringify({ error: 'AI 응답이 비어있습니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Strategy generated successfully, length:', strategyContent.length);

    // Save the report to database
    const { data: reportData, error: reportError } = await supabase
      .from('strategy_reports')
      .insert({
        user_id: user.id,
        survey_id: survey_data.id || null,
        content: strategyContent,
        product_name: survey_data.products?.[0]?.product_name || null,
        target_regions: survey_data.target_regions || [],
        credit_cost: STRATEGY_CREDIT_COST,
      })
      .select('id')
      .single();

    if (reportError) {
      console.error('Error saving report:', reportError);
      // Continue anyway - report was generated successfully
    }

    console.log('Report saved with id:', reportData?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      strategy: strategyContent,
      report_id: reportData?.id,
      new_balance: creditResult.new_balance,
      deducted: STRATEGY_CREDIT_COST
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Strategy generation error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
