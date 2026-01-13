import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRATEGY_CREDIT_COST = 10;
const MODEL_NAME = 'grok-4-1-fast-reasoning';

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

    // Extract user_id directly from JWT payload
    const jwt = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    
    try {
      const parts = jwt.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        userId = payload.sub || null;
      }
    } catch (e) {
      console.error('JWT decode error:', e);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`User authenticated: ${userId}`);

    const { survey_data, request_id } = await req.json();

    if (!request_id) {
      return new Response(JSON.stringify({ error: 'Missing request_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct credits first (only once for entire report)
    const { data: creditData, error: creditError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
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

    console.log(`Credits deducted for user ${userId}: -${STRATEGY_CREDIT_COST}, new balance: ${creditResult.new_balance}`);

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

    // Create report record with pending status
    const { data: reportData, error: reportError } = await supabase
      .from('strategy_reports')
      .insert({
        user_id: userId,
        survey_id: survey_data.id || null,
        content: '',
        status: 'generating',
        sections: {},
        model: MODEL_NAME,
        product_name: survey_data.products?.[0]?.product_name || null,
        target_regions: survey_data.target_regions || [],
        credit_cost: STRATEGY_CREDIT_COST,
      })
      .select('id')
      .single();

    if (reportError) {
      console.error('Failed to create report record:', reportError);
      // Refund credits
      await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: -STRATEGY_CREDIT_COST,
        p_action_type: 'STRATEGY',
        p_request_id: `${request_id}_refund`,
        p_meta: { type: 'refund', reason: 'db_error', original_request_id: request_id }
      });
      return new Response(JSON.stringify({ error: 'Failed to create report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reportId = reportData.id;
    console.log(`Created report record: ${reportId}`);

    // Generate Executive Summary (fast call)
    const summaryPrompt = `당신은 수출 전략 분석 전문가입니다. 다음 기업 정보를 바탕으로 짧은 요약과 8개 섹션의 개요를 작성하세요.

기업 정보:
- 웹사이트: ${survey_data.company_website || '미입력'}
- 회사 설명: ${survey_data.company_description || '미입력'}
- 설립연도: ${survey_data.year_founded || '미입력'}
- 직원 수: ${survey_data.employee_count || '미입력'}
- 핵심 강점: ${survey_data.core_strengths || '미입력'}
- 수출 경험: ${exportExperience}
- 기존 시장: ${existingMarkets}
- 인증: ${certifications}
- 목표 지역: ${targetRegions}
- 제품: ${productList}

다음 형식으로 한국어로 작성하세요:

## 경영진 요약
(3-4문장으로 핵심 분석 결과 요약)

## 리포트 구성
1. 기업 개요 및 제품 포지셔닝
2. 글로벌 시장 동향 및 수출 가능성 진단
3. 주요 경쟁사 및 대체재 분석
4. 목표 수출 시장 및 진입 논리
5. HS CODE 및 수입 구조 분석
6. 국가별 진입 장벽 및 리스크 요인
7. 유통 구조 및 잠재 바이어 유형
8. 수출 전략 및 단계별 실행 제안`;

    console.log('Generating executive summary...');
    
    const summaryResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('Summary generation failed:', errorText);
      
      // Update report status to error
      await supabase
        .from('strategy_reports')
        .update({ status: 'error' })
        .eq('id', reportId);
      
      // Refund credits
      await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: -STRATEGY_CREDIT_COST,
        p_action_type: 'STRATEGY',
        p_request_id: `${request_id}_refund`,
        p_meta: { type: 'refund', reason: 'ai_failure', original_request_id: request_id }
      });
      
      return new Response(JSON.stringify({ error: 'AI 요약 생성 실패', refunded: true }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const summaryData = await summaryResponse.json();
    const summaryMarkdown = summaryData.choices?.[0]?.message?.content || '';

    // Save summary to database
    await supabase
      .from('strategy_reports')
      .update({ 
        summary_markdown: summaryMarkdown,
        status: 'generating'
      })
      .eq('id', reportId);

    console.log('Executive summary generated, length:', summaryMarkdown.length);

    return new Response(JSON.stringify({
      success: true,
      report_id: reportId,
      summary_markdown: summaryMarkdown,
      new_balance: creditResult.new_balance,
      survey_context: {
        company_website: survey_data.company_website,
        company_description: survey_data.company_description,
        year_founded: survey_data.year_founded,
        employee_count: survey_data.employee_count,
        core_strengths: survey_data.core_strengths,
        export_experience: exportExperience,
        existing_markets: existingMarkets,
        certifications,
        target_regions: targetRegions,
        product_list: productList,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: '예기치 않은 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
