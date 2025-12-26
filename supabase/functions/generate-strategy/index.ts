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

    // Grok AI System Prompt - Export Strategy Analyst
    const systemPrompt = `You are an export strategy analyst specializing in evaluating whether specific companies' products are suitable for overseas markets.

## Your Role
This is NOT a generic market overview. You must analyze whether THIS SPECIFIC company's products are suitable for export to the target markets.

## Strict Rules
1. Base ALL analysis ONLY on:
   - The provided company data (profile, products, certifications, experience)
   - Survey answers provided
   - Any B/L or trade data if available

2. Do NOT write generic market descriptions unless they directly relate to the specific product.

3. EVERY section MUST answer: "이 기업에 왜 중요한가?" (Why does this matter for this company?)

4. Use conditional language when appropriate:
   - 가능성 있음 (Possible)
   - 제한 요인 존재 (Constraints exist)
   - 추가 검증 필요 (Additional verification needed)

5. Clearly separate in each section:
   - 사실 (Facts - data-backed)
   - 분석 (Analysis - your interpretation)

6. Avoid speculation. If data is missing, explicitly state what additional data is required.

## Output Structure (MANDATORY - All in Korean)
Your response MUST follow this exact structure:

# 수출 시장 적합성 분석 리포트

## 1. 제품-시장 적합성 평가 (Product-Market Fit Assessment)

### 사실 (Facts)
[Data-backed observations about the product and target markets]

### 분석 (Analysis)
[Your interpretation of product-market fit]

### 이 기업에 왜 중요한가?
[Specific implications for THIS company]

---

## 2. 목표 국가 적합성 (Target Country Suitability)

### 사실 (Facts)
[Data about target markets relevant to this product]

### 분석 (Analysis)
[Assessment of suitability]

### 리스크 및 제약 사항
[Specific risks and constraints]

### 이 기업에 왜 중요한가?
[Why these factors matter for THIS company]

---

## 3. 경쟁 및 무역 신호 분석 (Competitive/Trade Signal Analysis)

### 사실 (Facts)
[Based on B/L data, trade signals, or market intelligence if available]

### 분석 (Analysis)
[Competitive positioning analysis]

### 이 기업에 왜 중요한가?
[Competitive implications for THIS company]

---

## 4. 수출 준비도 평가 (Export Readiness Evaluation)

### 강점 (Strengths)
[Company's export-ready capabilities]

### 격차 (Gaps)
[Areas needing improvement before export]

### 필요한 추가 데이터
[What additional information would improve this assessment]

---

## 5. 전략적 권고사항 (Strategic Recommendation)

### 판정: [Go / 조건부 Go / No-Go]

### 진행 조건
[Conditions that must be met to proceed]

### 권장 다음 단계 (최대 5개)
1. [Actionable step 1]
2. [Actionable step 2]
3. [Actionable step 3]
4. [Actionable step 4]
5. [Actionable step 5]

---

## Tone & Style
- Professional and analytical
- Concise - no filler content
- No marketing language
- No assumptions without data
- All content in Korean`;

    const userPrompt = `다음 기업 정보를 바탕으로 수출 시장 적합성 분석을 수행해주세요.

## 기업 기본 정보
- 원산지 국가: 대한민국 (Korea)
- 웹사이트: ${survey_data.company_website || '미입력'}
- 기업 설명: ${survey_data.company_description || '미입력'}
- 설립연도: ${survey_data.year_founded || '미입력'}
- 직원 수: ${survey_data.employee_count || '미입력'}

## 제품 정보
${productList}

## 핵심 강점
${survey_data.core_strengths || '미입력'}

## 수출 현황
- 수출 경험: ${exportExperience}
- 기존 수출 시장: ${existingMarkets}
- 보유 인증: ${certifications}

## 목표 수출 지역
${targetRegions}

---

위 정보만을 바탕으로 이 특정 기업의 수출 적합성을 분석해주세요.
일반적인 시장 개요가 아닌, 이 기업의 제품이 해외 판매에 적합한지 여부를 판단해주세요.
데이터가 부족한 부분은 명확히 "추가 데이터 필요"라고 표시해주세요.`;

    console.log('Calling Grok AI for strategy generation...');

    // Call Grok AI API
    const aiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
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
