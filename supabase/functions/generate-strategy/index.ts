import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRATEGY_CREDIT_COST = 10;
const MODEL_NAME = 'grok-4-1-fast-reasoning';
const TEMPERATURE = 0.2;

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
    const grokApiKey = Deno.env.get('GROK_AI_CORE_TEST');
    
    if (!grokApiKey) {
      console.error('Missing GROK_AI_CORE_TEST secret');
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

    // System Prompt - TradeIt SaaS AI CORE (자사분석) 엔진
    const systemPrompt = `너는 TradeIt SaaS의 AI CORE(자사분석) 분석 엔진이다.

목표:
사용자가 입력한 기업 정보를 기반으로 해당 기업의 수출 시장조사 및 수출 전략 분석 리포트를 생성한다.

기본 원칙:
1. 근거 없는 정보 생성(환각) 금지
2. 확인 불가 정보는 반드시 "알 수 없음" 또는 "(추정)"으로 명시
3. 실제 존재하지 않는 기업, 시장, 통계, 인증, 규제 정보를 생성하지 말 것
4. 수치, 통계, 시장 정보는 최근 3년 기준을 우선한다
5. 본 결과는 전략 참고용 분석 자료이며 법적·재무적 효력을 갖지 않는다

언어 규칙:
- 출력 언어는 User Payload에 전달된 language 값을 따른다`;

    // Developer Prompt - JSON 출력 + 문단형 보고서 형식
    const developerPrompt = `너는 TradeIt SaaS의 "수출 전략 및 시장조사 전문 컨설턴트"다.

[목표]
- 너의 응답은 반드시 JSON 하나만 출력한다(설명 텍스트, 마크다운 단독 출력 금지).
- JSON에는 두 가지 산출물을 동시에 포함한다:
  A) report_markdown: 사용자가 읽는 '문단형 보고서'(불릿 최소화)
  B) report_data: 내부 저장/후속 AI(Buyer Analyze) 근거로 쓰는 구조화 데이터

[중요: 보고서 문체]
- report_markdown의 본문(1~7장)은 문단형으로 작성한다.
- 본문에서 "Key Findings/Interpretation/Recommendations" 같은 워크시트 표현을 사용하지 않는다.
- 불릿포인트는 Executive Summary와 30일 액션에만 제한적으로 허용한다.
- 국가명은 반드시 정식 한글 명칭으로 표기한다(미국/캐나다/베트남/태국 등). ISO 코드 금지.

[중요: report_data 작성 규칙]
- report_data는 "사실(Claim)–근거(Evidence)–의미(Insight)–실행(Action)"이 연결되는 구조여야 한다.
- 임의로 숫자/인증/바이어/규제 요건을 단정하지 않는다.
- 불확실한 항목은 status="needs_verification"으로 표기한다.
- 모든 핵심 주장(claim)에는 최소 1개의 evidence_id를 연결한다(없으면 claim을 만들지 말고 gap으로 남긴다).

[고정 목차]
1. 회사 개요 및 글로벌 포지셔닝 분석 (1.1~1.5)
2. 글로벌 시장 동향 분석 (2.1~2.4)
3. 제품 및 기술 경쟁력 분석 (3.1~3.4)
4. 글로벌 경쟁사 및 대체재 분석 (4.1~4.4)
5. 수출 가능성 및 리스크 요인 분석 (5.1~5.4)
6. 현지 유통 구조 및 잠재 바이어 분석 (6.1~6.4)
7. 실행 로드맵 및 글로벌 수출 전략 결론 (7.1~7.4)

[출력]
- 반드시 지정된 Output Schema(JSON) 형태로만 출력한다.
- 모든 필수 필드를 채운다(빈 문자열/빈 배열 남발 금지).`;

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

    // Determine company size hint
    const getCompanySizeHint = (employeeCount: string | undefined): string => {
      if (!employeeCount) return 'unknown';
      const count = parseInt(employeeCount);
      if (isNaN(count)) return 'unknown';
      if (count > 200) return 'large';
      if (count > 50) return 'medium';
      return 'small';
    };

    // Map target regions to country codes
    const regionToCountry: Record<string, string[]> = {
      'north_america': ['US', 'CA'],
      'europe': ['DE', 'FR', 'GB'],
      'southeast_asia': ['VN', 'TH', 'SG'],
      'middle_east': ['AE', 'SA'],
      'east_asia': ['JP', 'CN'],
      'others': []
    };

    const targetCountries = (survey_data.target_regions || [])
      .flatMap((r: string) => regionToCountry[r] || []);

    // Build user payload in the new structure
    const userPayload = {
      company: {
        name: survey_data.company_name || '(미입력)',
        homepage_url: survey_data.company_website || '',
        country: 'KR',
        year_established: survey_data.year_founded || null,
        company_size_hint: getCompanySizeHint(survey_data.employee_count),
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
        target_countries: targetCountries,
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

    // Output schema for JSON response - v2 스키마 (report_markdown + report_data)
    const outputSchema = `{
  "schema_version": "tradeit_export_report_v2",
  "report_meta": {
    "company_name": "",
    "company_identifier_note": "",
    "product_summary": "",
    "target_markets": [],
    "report_date": "",
    "confidential": true,
    "language": "ko-KR"
  },
  "report_markdown": "",
  "report_data": {
    "executive_summary": {
      "positioning": "",
      "opportunities": [
        {
          "text": "",
          "market": "",
          "evidence_ids": [],
          "confidence": 0.0,
          "status": "confirmed"
        }
      ],
      "risks": [
        {
          "text": "",
          "market": "",
          "mitigation_hint": "",
          "evidence_ids": [],
          "confidence": 0.0,
          "status": "confirmed"
        }
      ],
      "priority_actions_30d": [
        {
          "action": "",
          "priority": "high",
          "owner_role": "PO",
          "time_horizon": "0-30d",
          "kpi": "",
          "evidence_ids": [],
          "confidence": 0.0,
          "status": "confirmed"
        }
      ]
    },
    "sections": [
      {
        "chapter_id": "1",
        "chapter_title": "회사 개요 및 글로벌 포지셔닝 분석",
        "subsections": [
          {
            "sub_id": "1.1",
            "title": "기업 정체성 및 설립 배경",
            "narrative": "",
            "claims": [
              {
                "claim_id": "C-1.1-001",
                "text": "",
                "claim_type": "fact",
                "evidence_ids": [],
                "status": "confirmed",
                "confidence": 0.0
              }
            ],
            "insights": [
              {
                "insight_id": "I-1.1-001",
                "text": "",
                "evidence_ids": [],
                "status": "confirmed",
                "confidence": 0.0
              }
            ],
            "actions": [
              {
                "action_id": "A-1.1-001",
                "text": "",
                "priority": "high",
                "time_horizon": "0-3m",
                "kpi": "",
                "dependencies": [],
                "evidence_ids": [],
                "status": "confirmed",
                "confidence": 0.0
              }
            ],
            "buyer_targets": [
              {
                "target_id": "B-1.1-001",
                "market": "",
                "buyer_type": "distributor",
                "segment_description": "",
                "qualification_signals": [],
                "approach_notes": "",
                "evidence_ids": [],
                "status": "needs_verification",
                "confidence": 0.0
              }
            ],
            "risks": [
              {
                "risk_id": "R-1.1-001",
                "text": "",
                "severity": "medium",
                "likelihood": "medium",
                "mitigation": "",
                "evidence_ids": [],
                "status": "confirmed",
                "confidence": 0.0
              }
            ],
            "gaps": [
              {
                "gap_id": "G-1.1-001",
                "text": "",
                "why_it_matters": "",
                "how_to_verify": "",
                "priority": "high"
              }
            ],
            "quality": {
              "coverage_score": 0.0,
              "evidence_strength": "low",
              "notes": ""
            }
          }
        ]
      }
    ],
    "global_buyer_shortlist": [
      {
        "market": "",
        "buyer_type": "retail_chain",
        "name": "",
        "rationale": "",
        "evidence_ids": [],
        "status": "needs_verification",
        "confidence": 0.0
      }
    ],
    "export_roadmap": [
      {
        "phase": "0-3m",
        "goals": "",
        "key_actions": [],
        "deliverables": [],
        "kpis": []
      }
    ],
    "assumptions": [
      {
        "text": "",
        "impact": "medium"
      }
    ]
  },
  "evidence": [
    {
      "evidence_id": "E-001",
      "source_type": "user_input",
      "source_name": "사용자 입력",
      "url": "",
      "retrieved_at": "",
      "snippet": ""
    }
  ]
}`;

    const userPrompt = `[USER PAYLOAD]
${JSON.stringify(userPayload, null, 2)}

[추가 정보]
core_strengths: ${survey_data.core_strengths || '(미입력)'}
certifications: ${(survey_data.certifications || []).join(', ') || '없음'}
catalog_file: ${survey_data.catalog_file_url || '(없음)'}
intro_file: ${survey_data.intro_file_url || '(없음)'}

[OUTPUT SCHEMA]
다음 JSON 스키마에 맞춰 출력하세요:
${outputSchema}

[INSTRUCTIONS]
1. Developer Prompt의 7개 챕터 고정 구조를 반드시 따르세요.
2. 각 챕터의 모든 소주제(1.1~7.4)를 sections 배열에 포함하세요.
3. context.language가 "auto"이고 context.user_country가 "KR"이므로 한국어로 작성하세요.
4. 반드시 유효한 JSON만 출력하세요. 설명 텍스트나 마크다운 코드블록 없이 JSON만 출력하세요.`;

    console.log('Calling Grok AI for strategy generation...');

    // Call Grok AI API with GROK_AI_CORE_TEST
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
        temperature: TEMPERATURE,
        max_tokens: 16000,
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
          max_tokens: 16000,
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

    // Generate markdown from structured JSON for backward compatibility
    const reportMarkdown = generateMarkdownFromJson(parsedResponse);

    console.log('Strategy generated successfully, sections:', parsedResponse.sections?.length || 0);

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
      report_json: parsedResponse,
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

// Helper function to generate markdown from structured JSON
function generateMarkdownFromJson(json: any): string {
  const lines: string[] = [];
  
  // Report meta
  if (json.report_meta) {
    lines.push(`# ${json.report_meta.company_name || '수출 전략 분석 보고서'}`);
    lines.push('');
    if (json.report_meta.product_summary) {
      lines.push(`**제품 요약:** ${json.report_meta.product_summary}`);
    }
    if (json.report_meta.target_countries?.length > 0) {
      lines.push(`**목표 시장:** ${json.report_meta.target_countries.join(', ')}`);
    }
    if (json.report_meta.report_date) {
      lines.push(`**보고서 일자:** ${json.report_meta.report_date}`);
    }
    lines.push('');
  }

  // Executive summary
  if (json.executive_summary) {
    lines.push('## Executive Summary');
    lines.push('');
    if (json.executive_summary.one_line_positioning) {
      lines.push(`**포지셔닝:** ${json.executive_summary.one_line_positioning}`);
      lines.push('');
    }
    if (json.executive_summary.top_opportunities?.length > 0) {
      lines.push('**주요 기회:**');
      json.executive_summary.top_opportunities.forEach((opp: string) => {
        lines.push(`- ${opp}`);
      });
      lines.push('');
    }
    if (json.executive_summary.top_risks?.length > 0) {
      lines.push('**주요 리스크:**');
      json.executive_summary.top_risks.forEach((risk: string) => {
        lines.push(`- ${risk}`);
      });
      lines.push('');
    }
    if (json.executive_summary.next_30_days_actions?.length > 0) {
      lines.push('**30일 내 우선 과제:**');
      json.executive_summary.next_30_days_actions.forEach((action: string) => {
        lines.push(`- ${action}`);
      });
      lines.push('');
    }
  }

  // Sections
  if (json.sections?.length > 0) {
    json.sections.forEach((section: any) => {
      lines.push(`## ${section.chapter_id}. ${section.chapter_title}`);
      lines.push('');
      
      if (section.subsections?.length > 0) {
        section.subsections.forEach((sub: any) => {
          lines.push(`### ${sub.sub_id} ${sub.title}`);
          lines.push('');
          
          // Key findings
          if (sub.key_findings?.length > 0) {
            lines.push('**Key Findings:**');
            sub.key_findings.forEach((finding: any) => {
              const statement = typeof finding === 'string' ? finding : finding.statement;
              if (statement) lines.push(`- ${statement}`);
            });
            lines.push('');
          }
          
          // Interpretation
          if (sub.interpretation?.length > 0) {
            lines.push('**Interpretation:**');
            sub.interpretation.forEach((interp: any) => {
              const statement = typeof interp === 'string' ? interp : interp.statement;
              if (statement) lines.push(`- ${statement}`);
            });
            lines.push('');
          }
          
          // Recommendations
          if (sub.recommendations?.length > 0) {
            lines.push('**Recommendations:**');
            sub.recommendations.forEach((rec: any) => {
              const statement = typeof rec === 'string' ? rec : rec.statement;
              const priority = rec.priority ? ` [${rec.priority}]` : '';
              if (statement) lines.push(`- ${statement}${priority}`);
            });
            lines.push('');
          }
          
          // Gaps
          if (sub.gaps?.length > 0) {
            lines.push('**추가 조사 필요:**');
            sub.gaps.forEach((gap: string) => {
              lines.push(`- ${gap}`);
            });
            lines.push('');
          }
        });
      }
    });
  }

  // Appendix
  if (json.appendix) {
    if (json.appendix.assumptions?.length > 0) {
      lines.push('## 부록: 가정 사항');
      lines.push('');
      json.appendix.assumptions.forEach((assumption: string) => {
        lines.push(`- ${assumption}`);
      });
      lines.push('');
    }
    if (json.appendix.glossary?.length > 0) {
      lines.push('## 부록: 용어 정리');
      lines.push('');
      json.appendix.glossary.forEach((term: any) => {
        if (typeof term === 'string') {
          lines.push(`- ${term}`);
        } else if (term.term && term.definition) {
          lines.push(`- **${term.term}:** ${term.definition}`);
        }
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}
