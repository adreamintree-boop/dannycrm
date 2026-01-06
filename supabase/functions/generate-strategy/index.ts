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

    // Enhanced System Prompt - Evidence-first & Structured Report
    const systemPrompt = `You are a senior export strategy analyst at a global trade advisory firm.
You write premium-quality export strategy reports for manufacturing and B2B companies.
Your reports are used for executive decision-making, investor briefings, and trade agency submissions.

## ABSOLUTE RULES - NEVER BREAK THESE
1. NO GENERIC MARKET OVERVIEWS - Every sentence must be company-specific.
2. EVIDENCE FIRST - If you don't have data, say "데이터 필요: [what], [why], [how to get]"
3. NO MADE-UP NUMBERS - All figures must be labeled as:
   - "제공됨" (from survey/files)
   - "외부 검증 필요" (needs external validation)
4. CONNECT EVERY CLAIM TO THIS COMPANY - Why does this matter for THIS specific company?
5. SEPARATE FACTS VS ANALYSIS - Clearly distinguish what's given vs what's inferred.

## REQUIRED OUTPUT STRUCTURE
You MUST produce TWO separate outputs in a single JSON response:

1. "report_markdown": A human-readable report in Korean WITHOUT any markdown tables.
   - Use bullet points, numbered lists, headings, and prose only
   - Tables should NOT appear in this field

2. "report_structured": A JSON object containing structured data arrays for all tables.

## REPORT SECTIONS (All in Korean)

### 0) 요약 (Executive Summary)
- 적합성 판정: Go / 조건부 Go / No-Go
- 상위 3가지 이유
- 상위 3가지 리스크
- 즉시 실행 5단계

### 1) 기업 스냅샷 (Company Snapshot)
→ Structured data in report_structured.company_snapshot

### 2) 제품 개요 및 수출 가능성 진단
- 제품/서비스 정의 (from description, strengths, files)
- 핵심 차별화 요소
- 수출 적합성 분석

### 3) 경쟁 정보 (Competitive Intelligence)
→ AT LEAST 8 competitors in report_structured.competitors
→ Columns: name, country, offering, pricing_tier, relevance, how_to_win

### 4) 목표 시장 및 국가 후보
→ AT LEAST 5 countries in report_structured.target_countries
→ Columns: country, why_fit, entry_barriers, channel, proof_needed

### 5) 인증/규제/장벽 (Compliance)
→ Per-country table in report_structured.compliance
→ Columns: market, regulations, actions, effort (low/med/high), why_it_matters

### 6) 유통 구조 및 채널
- 직접 vs 파트너 vs 마켓플레이스
- 기업 규모와 제품 특성에 맞는 채널 적합도

### 7) 바이어 유형 (Buyer Archetypes)
→ AT LEAST 6 buyer types in report_structured.buyer_archetypes
→ Types: EPC/Distributor/End-user/OEM/Agency/Enterprise etc.
→ Columns: type, description, buying_trigger, decision_maker, message_angle

### 8) 90일 GTM 계획
→ Week-by-week plan in report_structured.gtm_plan_90d
→ Columns: phase, weeks, actions, deliverables, kpi

### 9) 누락 증빙 체크리스트
→ Priority-grouped in report_structured.missing_data
→ Columns: priority (P0/P1/P2), what, why, how_to_get_fast

## JSON OUTPUT FORMAT (STRICT - Return ONLY valid JSON)

{
  "report_markdown": "...(Korean report text, NO markdown tables)...",
  "report_structured": {
    "company_snapshot": [
      {"field": "설립연도", "value": "...", "confidence": "높음/중간/낮음", "notes": "..."}
    ],
    "competitors": [
      {"name": "...", "country": "...", "offering": "...", "pricing_tier": "...", "relevance": "...", "how_to_win": "..."}
    ],
    "target_countries": [
      {"country": "...", "why_fit": "...", "entry_barriers": "...", "channel": "...", "proof_needed": "..."}
    ],
    "compliance": [
      {"market": "...", "regulations": "...", "actions": "...", "effort": "low/med/high", "why_it_matters": "..."}
    ],
    "buyer_archetypes": [
      {"type": "...", "description": "...", "buying_trigger": "...", "decision_maker": "...", "message_angle": "..."}
    ],
    "gtm_plan_90d": [
      {"phase": "Phase 1", "weeks": "1-2주차", "actions": "...", "deliverables": "...", "kpi": "..."}
    ],
    "missing_data": [
      {"priority": "P0/P1/P2", "what": "...", "why": "...", "how_to_get_fast": "..."}
    ]
  },
  "quality_checks": {
    "is_company_specific": true,
    "used_only_provided_data": true,
    "external_validation_needed": ["list of items needing external validation"]
  }
}

## Tone & Style
- Professional, analytical, consulting-quality
- Concise - no filler, no generic content
- Use conditional language when uncertain
- Write everything in Korean except technical terms`;

    const userPrompt = `[BEGIN INPUT]

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

[END INPUT]

[YOUR TASK]
Generate a deep export strategy report similar to professional consulting deliverables.
Follow the JSON output format exactly.
Return ONLY valid JSON - no text before or after the JSON.

IMPORTANT REQUIREMENTS:
1) Product overview & export feasibility diagnosis
   - Extract "main product/service" and "unique strengths" from description + strengths + files
   - Write strong product definition + differentiators

2) Competitive intelligence
   - AT LEAST 8 competitors with: name, country, offering, pricing_tier, relevance, how_to_win

3) Target market & country shortlist
   - AT LEAST 5 target countries with: why_fit, barriers, channel, proof_needed

4) Compliance / regulation / barriers
   - Per country: regulations, actions, effort (low/med/high), why_it_matters

5) Distribution structure & channels
   - direct vs partner vs marketplace reasoning for company size and product type

6) Buyer archetypes (AT LEAST 6)
   - For each: buying_trigger, decision_maker, message_angle

7) 90-day GTM plan
   - Week-by-week with deliverables and KPIs

8) Missing evidence checklist
   - P0/P1/P2 priority, with why and how to get quickly

CRITICAL: Return ONLY the JSON object. No markdown code blocks, no explanatory text.`;

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
      console.log(`Refunding credits for user ${user.id} due to AI failure`);
      await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
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
        p_user_id: user.id,
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
            p_user_id: user.id,
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
          p_user_id: user.id,
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
    const reportStructured = parsedResponse.report_structured || {};
    const qualityChecks = parsedResponse.quality_checks || {};

    console.log('Strategy generated successfully, markdown length:', reportMarkdown.length);

    // Save the report to database with both markdown and JSON
    const { data: reportData, error: reportError } = await supabase
      .from('strategy_reports')
      .insert({
        user_id: user.id,
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
      report_structured: reportStructured,
      quality_checks: qualityChecks,
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
