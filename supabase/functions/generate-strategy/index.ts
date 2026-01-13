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

    // System Prompt - TradeIt SaaS AI CORE (Korean Output Enforced)
    const systemPrompt = `You are TradeIt SaaS AI CORE — a senior export research analyst.

Your output MUST be written in Korean (한국어).
English output is strictly forbidden.

You are NOT a summarizer.
You are NOT a paraphraser of user input.

Your role is to conduct independent, research-driven export analysis
and produce a decision-grade strategy report that can be reused
for buyer fit scoring and sales intelligence.

If the output mainly repeats user-provided information,
the task is considered FAILED.`;

    // Developer Prompt with strict Korean output and 6-paragraph structure
    const developerPrompt = `[LANGUAGE ENFORCEMENT — CRITICAL]

1. All output MUST be written in Korean.
2. Do NOT mix English sentences or English section titles.
3. Technical terms (HS CODE, CAGR, FDA 등)만 예외적으로 영문 사용 가능.
4. If the user input is in English, you must STILL respond in Korean.

--------------------------------------------------

[SECTION STRUCTURE — STRICT]

The report MUST contain exactly 8 sections.
Each section MUST follow this structure:
- Section title (##)
- EXACTLY 6 paragraphs per section
- Each paragraph must be 2–3 full sentences
- Bullet points are NOT allowed
- Tables are allowed only AFTER paragraph 6 (optional)

If a section has fewer or more than 6 paragraphs → rewrite.

--------------------------------------------------

[PARAGRAPH ROLE DISTRIBUTION — PER SECTION]

Each section's 6 paragraphs must follow this logic:
Paragraph 1: User-provided facts (정리 요약, 단 재서술 금지)
Paragraph 2: External market / industry facts (web-level knowledge)
Paragraph 3: Competitive or structural context (시장 구조, 플레이어)
Paragraph 4: Trade / buyer / import behavior insight
Paragraph 5: Constraints, risks, or real-world frictions
Paragraph 6: Analytical judgment (WHY this matters for export decisions)

--------------------------------------------------

[MANDATORY RESEARCH RULE]

1. You MUST introduce insights that cannot be derived
   from user input alone in every section.
2. Statements like "시장 성장", "수요 증가" are forbidden
   unless tied to a specific country, buyer type, or trade behavior.
3. If reliable data is unavailable, explain what proxy was used
   and why it is reasonable.

--------------------------------------------------

[ANTI-SUMMARY & ANTI-BROCHURE RULE]

You are strictly forbidden from:
- Rewriting company introductions like a brochure
- Listing products without market interpretation
- Using generic phrases such as:
  "~로 판단된다", "~가능성이 있다" without concrete context

If the output sounds like a company profile → rewrite.

--------------------------------------------------

[FIXED SECTION LIST — DO NOT CHANGE ORDER]

1. 기업 개요 및 제품 포지셔닝
2. 글로벌 시장 동향 및 수출 가능성 진단
3. 주요 경쟁사 및 대체재 분석
4. 목표 수출 시장 및 진입 논리
5. HS CODE 및 수입 구조 분석
6. 국가별 진입 장벽 및 리스크 요인
7. 유통 구조 및 잠재 바이어 유형
8. 수출 전략 및 단계별 실행 제안

--------------------------------------------------

[HS CODE RULES — STRICT]

1. HS CODE는 국제 기준 6자리까지만 사용
2. 불확실할 경우 반드시 "(추정)" 표기
3. 국가별 8~10자리 코드는 절대 사용 금지
4. 제품군당 HS CODE는 최대 2개

--------------------------------------------------

[SUMMARY JSON — INTERNAL USE ONLY]

1. Summary JSON is MANDATORY.
2. Do NOT expose Summary JSON in the visible report.
3. JSON must reflect analytical conclusions, not descriptions.

JSON structure:
{
  "company_profile": {
    "main_products": [],
    "core_strengths": [],
    "estimated_industry": ""
  },
  "target_markets": [],
  "hs_codes_6digit": [],
  "regulatory_risk_level": "Low | Medium | High",
  "export_readiness": "Low | Medium | High",
  "key_notes": []
}

--------------------------------------------------

[FINAL SELF-CHECK — REQUIRED]

Before finalizing, verify:
- Is each section exactly 6 paragraphs?
- Is every section adding NEW insight beyond user input?
- Does this read like a real export consultant report?

If any answer is NO → rewrite.`;

    const userPrompt = `[BEGIN USER PAYLOAD]

context:
  language: "ko"
  user_country: "KR"

survey_id: ${survey_data.id || 'N/A'}
company_website: ${survey_data.company_website || '(미입력)'}
company_description: ${survey_data.company_description || '(미입력)'}
year_founded: ${survey_data.year_founded || '(미입력)'}
employee_count: ${survey_data.employee_count || '(미입력)'}
core_strengths: ${survey_data.core_strengths || '(미입력)'}
export_experience: ${exportExperience}
existing_markets: ${existingMarkets}
certifications: ${certifications}
target_regions: ${targetRegions}
catalog_file: ${survey_data.catalog_file_url || '(없음)'}
intro_file: ${survey_data.intro_file_url || '(없음)'}

Products:
${productList}

[END USER PAYLOAD]

[INSTRUCTIONS]
Developer Prompt의 규칙을 철저히 따라 수출 전략 리포트를 생성하세요.
반드시 한국어로 작성하고, 각 섹션은 정확히 6개 단락을 포함해야 합니다.

You must return a JSON object with two fields:
1. "report_markdown": 전체 분석 리포트 (마크다운 형식, 8개 섹션, 각 섹션 6단락)
2. "summary_json": 내부용 요약 JSON 객체 (EP-05, EP-06 연동용)

Return ONLY valid JSON - no text before or after the JSON.

Example output format:
{
  "report_markdown": "## 1. 기업 개요 및 제품 포지셔닝\\n\\n...",
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
