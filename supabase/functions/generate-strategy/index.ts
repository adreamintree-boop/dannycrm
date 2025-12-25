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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
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
        type: 'market_research',
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

    // Build the AI prompt with survey data
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

    const systemPrompt = `당신은 한국 중소기업의 수출 전략을 전문으로 분석하는 시장조사 전문가입니다.
주어진 기업 정보를 바탕으로 구체적이고 실행 가능한 수출 전략 리포트를 작성해야 합니다.

리포트는 반드시 다음 9개 섹션을 포함해야 합니다:

1. 제품 개요 및 수출 가능성 진단
   - 제품 특성, 기술적 강점, 수출 가능성 평가

2. 경쟁사 관련 정보
   - 해당 산업 분야의 글로벌 주요 경쟁사 분석 (실제 기업명 포함)
   - 표 형식: 기업명, 국가, 주요 제품, 특징

3. 목표 수출 시장 개요
   - 타겟 지역별 시장 특성 및 진출 전략
   - 표 형식: 지역, 시장 규모, 특징, 진입 난이도

4. 수입 통계 및 HS CODE 분석
   - 관련 HS CODE 추정 및 설명
   - 주요국 수입 통계 트렌드 분석

5. 진입 장벽 및 리스크 요소
   - 국가별 필수 인증 및 규제
   - 기술/가격 장벽, 시장 진입 리스크

6. 현지 유통 구조 및 유통 채널 분석
   - 직접 수출 vs 유통상 활용 전략
   - 권장 유통 채널 및 바이어 발굴 경로

7. 잠재 바이어 유형 제안
   - 타겟 바이어 유형별 특성 및 접근 전략
   - 표 형식: 바이어 유형, 설명, 접근 방법

8. 마케팅·세일즈 전략 제안
   - 차별화 포인트 및 USP
   - 추천 전시회, 온라인 플랫폼, 아웃리치 전략

9. 요약 및 제안
   - 핵심 경쟁력 요약
   - 단계별 수출 전략 로드맵

모든 내용은 한국어로 작성하고, 마크다운 형식을 사용하세요.
표는 마크다운 테이블 형식으로 작성하세요.
구체적인 수치와 실제 데이터를 가능한 한 포함하세요.`;

    const userPrompt = `다음 기업 정보를 바탕으로 수출 전략 리포트를 작성해주세요:

## 기업 기본 정보
- 웹사이트: ${survey_data.company_website || '미입력'}
- 기업 설명: ${survey_data.company_description || '미입력'}
- 설립연도: ${survey_data.year_founded || '미입력'}
- 직원 수: ${survey_data.employee_count || '미입력'}

## 주요 제품
${productList}

## 핵심 강점
${survey_data.core_strengths || '미입력'}

## 수출 현황
- 수출 경험: ${exportExperience}
- 기존 수출 시장: ${existingMarkets}
- 보유 인증: ${certifications}

## 타겟 시장
- 목표 수출 지역: ${targetRegions}

이 정보를 바탕으로 구체적이고 실행 가능한 수출 전략 리포트를 작성해주세요.`;

    console.log('Calling Lovable AI for strategy generation...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI 서비스 크레딧이 부족합니다.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const strategyContent = aiData.choices?.[0]?.message?.content;

    if (!strategyContent) {
      console.error('No content in AI response:', aiData);
      return new Response(JSON.stringify({ error: 'AI 응답이 비어있습니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Strategy generated successfully');

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
