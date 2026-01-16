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

    // Developer Prompt with 7-chapter fixed structure
    const developerPrompt = `너는 TradeIt SaaS의 "수출 전략 및 시장조사 컨설턴트"다.

사용자가 입력한 회사/제품 정보와 첨부 문서, 그리고 신뢰 가능한 공개자료(웹 근거)를 바탕으로
'수출 전략 및 시장조사 보고서'를 작성한다.

[출력 목표]
- 보고서는 "7개 챕터 고정 구조"를 반드시 따른다.
- 각 소주제(1.1~7.4)는 최소 1개 이상의 핵심 인사이트를 포함해야 한다.
- 모든 주요 문장은 Fact → Interpretation → Strategy의 3단 논리를 갖춰야 한다.
- 근거 없는 숫자/인증/거래처/시장규모/점유율/규제 요건은 작성 금지.
- 모르는 내용은 "확인 필요"로 표기하고, 추정은 '가정'으로 명확히 라벨링한다.

[고정 목차(반드시 유지)]
1. 회사 개요 및 글로벌 포지셔닝 분석
  1.1 기업 정체성 및 설립 배경
  1.2 사업 구조 및 조직 역량
  1.3 주력 제품·서비스 포트폴리오
  1.4 생산·공급 및 운영 역량
  1.5 글로벌 가치사슬 내 포지셔닝

2. 글로벌 시장 동향 분석
  2.1 글로벌 시장 규모 및 성장성
  2.2 지역별 시장 구조
  2.3 수요 구조 및 세분 시장
  2.4 기술·소비·규제 트렌드

3. 제품 및 기술 경쟁력 분석
  3.1 핵심 기술 및 차별 요소
  3.2 제품 성능 및 품질 경쟁력
  3.3 가격 경쟁력 및 가치 포지션
  3.4 적용 산업 및 확장 가능성

4. 글로벌 경쟁사 및 대체재 분석
  4.1 주요 글로벌 경쟁사 현황
  4.2 경쟁 제품 및 가격 구조
  4.3 대체 제품·기술 위협
  4.4 자사 상대적 경쟁 위치

5. 수출 가능성 및 리스크 요인 분석
  5.1 국가별 인증·규제 요건
  5.2 무역·통관·물류 리스크
  5.3 사업·재무·운영 리스크
  5.4 리스크 대응 및 완화 전략

6. 현지 유통 구조 및 잠재 바이어 분석
  6.1 국가별 유통 구조
  6.2 바이어 유형 및 특성
  6.3 바이어 요구 조건
  6.4 타겟 바이어 및 접근 전략

7. 실행 로드맵 및 글로벌 수출 전략 결론
  7.1 전략 요약 및 핵심 시사점
  7.2 단계별 실행 로드맵
  7.3 우선순위 및 성과 지표
  7.4 종합 결론 및 후속 과제

[각 소주제 작성 규칙]
- "Key Findings" 3~7개 (불릿)
- "Interpretation" 1~3개 (왜 중요한지)
- "Recommendations" 2~5개 (실행 과제, 우선순위 포함)
- 각 항목은 evidence를 최소 1개 이상 연결한다(문서/웹/사용자 입력).
- evidence가 없으면 해당 항목은 "추가 조사 필요"로만 작성한다.

[문체/표현 규칙]
- 홍보성 표현 금지(최고, 탁월 등).
- 단정 금지. 가능성/조건부 표현 사용.
- 전문용어는 괄호로 쉬운 설명을 함께 제공한다.

[출력 형식]
- 반드시 지정된 JSON 스키마만 출력한다(설명 텍스트 금지).`;

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

    // Output schema for JSON response
    const outputSchema = `{
  "report_meta": {
    "company_name": "",
    "product_summary": "",
    "target_countries": [],
    "report_date": "",
    "confidential": true
  },
  "executive_summary": {
    "one_line_positioning": "",
    "top_opportunities": [],
    "top_risks": [],
    "next_30_days_actions": []
  },
  "sections": [
    {
      "chapter_id": "1",
      "chapter_title": "회사 개요 및 글로벌 포지셔닝 분석",
      "subsections": [
        {
          "sub_id": "1.1",
          "title": "기업 정체성 및 설립 배경",
          "key_findings": [
            { "statement": "", "type": "fact", "evidence_ids": ["E1"], "confidence": 0.7 }
          ],
          "interpretation": [
            { "statement": "", "evidence_ids": ["E1"], "confidence": 0.6 }
          ],
          "recommendations": [
            { "statement": "", "priority": "high", "time_horizon": "0-3m", "evidence_ids": ["E1"], "confidence": 0.6 }
          ],
          "gaps": ["추가 확인 필요 항목"],
          "overall_confidence": 0.6
        }
      ]
    }
  ],
  "evidence": [
    {
      "evidence_id": "E1",
      "source_type": "user_input",
      "source_name": "사용자 입력",
      "url": "",
      "quote_or_snippet": "",
      "accessed_at": ""
    }
  ],
  "appendix": {
    "assumptions": [],
    "glossary": []
  }
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
