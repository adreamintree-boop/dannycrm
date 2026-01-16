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

    // Extract user_id directly from JWT payload (bypass auth.getUser which requires session)
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
      console.error('Failed to extract user_id from JWT');
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

    // Deduct credits first
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

    // System Prompt - TradeIt SaaS AI CORE (자사분석) 엔진
    const systemPrompt = `너는 TradeIt SaaS의 AI CORE(자사분석) 엔진이다.

너의 정체성:
너는 단순한 정보 요약 AI가 아니라,
정부·공공기관·대기업 프로젝트를 수행해온
"수출 전략 및 해외시장조사 전문 컨설턴트"다.

너의 역할:
사용자가 입력한 기업 정보, 제품 정보, 첨부 문서(회사소개서·카탈로그),
그리고 신뢰 가능한 공개 자료를 바탕으로,
해당 기업의 수출 가능성을 다각도로 분석하고
의사결정에 바로 활용 가능한 수준의
수출 시장조사 및 수출 전략 분석 리포트를 작성한다.

너의 책임 범위:
1. 단순한 사실 나열이나 교과서적 설명에 그치지 않는다.
2. 모든 주요 정보에 대해 다음 사고 단계를 반드시 수행한다.
   - 관찰된 사실(Fact)
   - 그 사실이 의미하는 바(Implication)
   - 이 기업에 미치는 영향(Impact on this company)
   - 전략적 시사점(Strategic takeaway)
3. "그래서 이 기업은 무엇을 해야 하는가?"에 답해야 한다.

기본 원칙:
- 근거 없는 정보 생성(환각)을 하지 않는다.
- 확인 불가 정보는 "알 수 없음" 또는 "(추정)"으로 표기한다.
- 존재하지 않는 기업·시장·통계·인증·규제 정보를 생성하지 않는다.
- 최근 3년 기준 정보를 우선한다.
- 본 분석은 전략 참고용이다.

중요:
이 출력물은
경영진, 해외영업 책임자, 실무자가
"이 보고서 하나로 다음 액션을 결정할 수 있는 수준"이어야 한다.`;

    // Developer Prompt with output language rules and section structure
    const developerPrompt = `[출력 언어 처리 규칙]

1. 출력 언어는 User Payload의 context.language 값을 따른다.
2. context.language가 "auto"인 경우 context.user_country 기준으로 결정한다.

언어 매핑:
- KR → ko
- JP → ja
- CN → zh (간체)
- TW → zh-TW
- 그 외 → en

--------------------------------------------------

[분석 사고 루트 강제 규칙 – 매우 중요]

모든 섹션은 내부적으로 반드시 아래 사고 단계를 거친다:
1) Fact
2) Implication
3) Impact on This Company
4) Strategic Takeaway

※ 출력 시 단계명은 노출하지 않되,
   문단 흐름상 자연스럽게 반영한다.

--------------------------------------------------

[출력 형식 규칙]

- 전체 출력은 Markdown 기반 분석 리포트 형식
- 섹션 제목은 ## 사용
- 각 섹션은 2~4개 문단
- bullet point는 보조 수단 (최대 5개)
- 표(Table)는 문단 설명 뒤에만 위치

--------------------------------------------------

[섹션 구성 – 순서 고정]

1. 기업 개요 및 제품 포지션
2. 글로벌 시장 동향 및 수출 가능성 진단
3. 주요 경쟁사 분석
4. 목표 수출 시장 분석
5. HS CODE(6자리) 및 수입 통계 분석
6. 국가별 진입 장벽 및 리스크
7. 유통 구조 및 잠재 바이어 유형
8. 수출 전략 및 실행 제안 (최대 3개)

--------------------------------------------------

[HS CODE 규칙]

- 국제 공통 6자리까지만 사용
- 불확실 시 "(추정)" 명시
- 제품군당 1~2개 이내

--------------------------------------------------

[첨부 문서 활용 규칙]

- 회사소개서/카탈로그가 있으면 1차 근거로 사용
- 단순 요약 금지, 전략적으로 재해석

--------------------------------------------------

[Summary JSON – 내부용]

- 반드시 생성
- 유저에게 노출 금지
- EP-05, EP-06 입력값으로만 사용
- 사실 + 판단 + 전략 힌트 포함

JSON structure:
{
  "company_profile": {
    "name": "",
    "main_products": [],
    "core_strengths": [],
    "estimated_industry": "",
    "company_size_hint": "small | medium | large | unknown",
    "business_type_hint": "Manufacturer | Brand | OEM/ODM | Distributor | Mixed | Unknown"
  },
  "target_markets": [],
  "hs_codes_6digit": [],
  "regulatory_risk_level": "Low | Medium | High",
  "export_readiness": "Low | Medium | High",
  "key_notes": []
}

--------------------------------------------------

[명시적 금지]

- 허구 정보 생성 금지
- HS CODE 6자리 초과 금지
- 단순 나열형 보고서 금지
- Summary JSON 누락 금지`;

    // Build structured user payload
    const exportExperienceMapping: Record<string, string> = {
      'direct': 'active',
      'indirect': 'limited',
      'no_experience': 'none',
      '': 'none'
    };
    const exportExpMapped = exportExperienceMapping[survey_data.export_experience || ''] || 'none';

    // Build products array
    const productsArray = (survey_data.products || [])
      .filter((p: any) => p.product_name?.trim())
      .map((p: any) => ({
        product_name: p.product_name || '',
        category: 'General',
        description: p.product_description || '',
        key_features: [],
        current_positioning: ''
      }));

    // Build user payload in the new structure
    const userPayload = {
      company: {
        name: survey_data.company_name || '(미입력)',
        homepage_url: survey_data.company_website || '',
        country: 'KR',
        year_established: survey_data.year_founded || null,
        company_size_hint: survey_data.employee_count ? 
          (parseInt(survey_data.employee_count) > 200 ? 'large' : 
           parseInt(survey_data.employee_count) > 50 ? 'medium' : 'small') : 'unknown',
        business_type_hint: 'Unknown'
      },
      products: productsArray.length > 0 ? productsArray : [{
        product_name: '(미입력)',
        category: 'General',
        description: survey_data.company_description || '',
        key_features: [],
        current_positioning: ''
      }],
      export_context: {
        export_experience: exportExpMapped,
        current_export_countries: survey_data.existing_markets || [],
        target_countries: (survey_data.target_regions || []).map((r: string) => {
          const regionToCountry: Record<string, string[]> = {
            'north_america': ['US', 'CA'],
            'europe': ['DE', 'FR', 'GB'],
            'southeast_asia': ['VN', 'TH', 'SG'],
            'middle_east': ['AE', 'SA'],
            'east_asia': ['JP', 'CN'],
            'others': []
          };
          return regionToCountry[r] || [];
        }).flat(),
        priority_objectives: ['long_term_market_entry'],
        time_horizon: 'mid_term'
      },
      constraints: {
        regulatory_sensitivity: 'Medium',
        price_competitiveness: 'Medium',
        certification_availability: (survey_data.certifications || []).length > 0 ? 'confirmed' : 'unknown',
        production_capacity_constraint: 'Low'
      },
      materials: {
        homepage_available: !!survey_data.company_website,
        company_profile_pdf: !!survey_data.intro_file_url,
        product_catalog_pdf: !!survey_data.catalog_file_url,
        materials_notes: ''
      },
      analysis_brief: {
        analysis_purpose: 'Export market suitability analysis',
        focus_questions: [
          '이 기업은 어떤 국가를 1차 타겟으로 삼아야 하는가?',
          '이 기업의 제품은 가격·기술·브랜드 중 무엇으로 경쟁해야 하는가?'
        ],
        importance_weights: {
          market_size: 'High',
          regulation: 'Medium',
          speed_to_market: 'High',
          margin_potential: 'Medium'
        }
      },
      context: {
        user_country: 'KR',
        language: 'auto'
      }
    };

    const userPrompt = `[BEGIN USER PAYLOAD]

${JSON.stringify(userPayload, null, 2)}

[END USER PAYLOAD]

[추가 정보]
core_strengths: ${survey_data.core_strengths || '(미입력)'}
certifications: ${certifications}
catalog_file: ${survey_data.catalog_file_url || '(없음)'}
intro_file: ${survey_data.intro_file_url || '(없음)'}

[INSTRUCTIONS]
Developer Prompt의 규칙을 철저히 따라 수출 전략 리포트를 생성하세요.
context.language가 "auto"이고 context.user_country가 "KR"이므로 한국어로 작성하세요.

You must return a JSON object with two fields:
1. "report_markdown": 전체 분석 리포트 (마크다운 형식, 8개 섹션)
2. "summary_json": 내부용 요약 JSON 객체 (EP-05, EP-06 연동용)

Return ONLY valid JSON - no text before or after the JSON.

Example output format:
{
  "report_markdown": "## 1. 기업 개요 및 제품 포지션\\n\\n...",
  "summary_json": {
    "company_profile": {...},
    "target_markets": [...],
    "hs_codes_6digit": [...],
    "regulatory_risk_level": "...",
    "export_readiness": "...",
    "key_notes": [...]
  }
}`;

    console.log('Calling Grok AI for strategy generation...');

    // Call Grok AI API
    const aiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: developerPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 12000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Grok AI error:', aiResponse.status, errorText);
      
      // Refund credits on AI failure
      console.log(`Refunding credits for user ${userId} due to AI failure`);
      await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: -STRATEGY_CREDIT_COST, // Negative to add back
        p_action_type: 'STRATEGY',
        p_request_id: `${request_id}_refund`,
        p_meta: { type: 'refund', reason: 'ai_failure', original_request_id: request_id }
      });
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', refunded: true }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        return new Response(JSON.stringify({ error: 'AI 서비스 인증에 실패했습니다.', refunded: true }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.', refunded: true }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    console.log('Grok AI response received, length:', JSON.stringify(aiData).length);

    let rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error('No content in AI response:', aiData);
      
      // Refund credits on empty response
      await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: -STRATEGY_CREDIT_COST,
        p_action_type: 'STRATEGY',
        p_request_id: `${request_id}_refund`,
        p_meta: { type: 'refund', reason: 'empty_response', original_request_id: request_id }
      });
      
      return new Response(JSON.stringify({ error: 'AI 응답이 비어있습니다.', refunded: true }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up the response - remove markdown code blocks if present
    rawContent = rawContent.trim();
    if (rawContent.startsWith('```json')) {
      rawContent = rawContent.slice(7);
    } else if (rawContent.startsWith('```')) {
      rawContent = rawContent.slice(3);
    }
    if (rawContent.endsWith('```')) {
      rawContent = rawContent.slice(0, -3);
    }
    rawContent = rawContent.trim();

    // Parse JSON
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('JSON parse error, attempting retry...', parseError);
      
      // Retry with explicit JSON request
      const retryResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${grokApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are a JSON formatter. Return only valid JSON.' },
            { role: 'user', content: `Convert this to valid JSON. Return ONLY the JSON, no explanations:\n\n${rawContent}` }
          ],
          temperature: 0,
          max_tokens: 12000,
        }),
      });
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        let retryContent = retryData.choices?.[0]?.message?.content?.trim() || '';
        
        // Clean up retry response
        if (retryContent.startsWith('```json')) retryContent = retryContent.slice(7);
        else if (retryContent.startsWith('```')) retryContent = retryContent.slice(3);
        if (retryContent.endsWith('```')) retryContent = retryContent.slice(0, -3);
        retryContent = retryContent.trim();
        
        try {
          parsedResponse = JSON.parse(retryContent);
        } catch {
          console.error('Retry also failed to parse JSON');
          
          // Refund credits on parse failure
          await supabase.rpc('deduct_credits', {
            p_user_id: userId,
            p_amount: -STRATEGY_CREDIT_COST,
            p_action_type: 'STRATEGY',
            p_request_id: `${request_id}_refund`,
            p_meta: { type: 'refund', reason: 'json_parse_failed', original_request_id: request_id }
          });
          
          return new Response(JSON.stringify({ 
            error: 'AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.',
            refunded: true
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Refund on retry failure
        await supabase.rpc('deduct_credits', {
          p_user_id: userId,
          p_amount: -STRATEGY_CREDIT_COST,
          p_action_type: 'STRATEGY',
          p_request_id: `${request_id}_refund`,
          p_meta: { type: 'refund', reason: 'retry_failed', original_request_id: request_id }
        });
        
        return new Response(JSON.stringify({ 
          error: 'AI 응답 처리 중 오류가 발생했습니다.',
          refunded: true
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const reportMarkdown = parsedResponse.report_markdown || '';
    const summaryJson = parsedResponse.summary_json || {};

    console.log('Strategy generated successfully, markdown length:', reportMarkdown.length);

    // Save the report to database with both markdown and JSON
    const { data: reportData, error: reportError } = await supabase
      .from('strategy_reports')
      .insert({
        user_id: userId,
        survey_id: survey_data.id || null,
        content: reportMarkdown,
        report_json: parsedResponse,
        model: MODEL_NAME,
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
      report_markdown: reportMarkdown,
      summary_json: summaryJson,
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
