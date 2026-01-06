import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_NAME = 'grok-4-1-fast-reasoning';

const SYSTEM_PROMPT = `You are a senior overseas sales strategist at a Korean export agency.
Your task is to analyze whether a SPECIFIC buyer company has strong business relevance with the client's products.

This is NOT a market report.
This is a practical buyer suitability memo for salespeople.

## RULES
1. Always base analysis on:
   - Company strategy report (if available)
   - Company survey data
   - Web research about the buyer (official site, news, LinkedIn, etc.)
2. Do NOT describe the buyer generically.
3. Do NOT explain the market unless it directly relates to product fit.
4. Focus on practical sales relevance and synergy.
5. Write in clear, professional Korean, natural paragraph style.
6. No tables, no scores, no JSON in the output.
7. Output must follow the EXACT section structure provided.
8. If data is missing, state it carefully without guessing.
9. Always think: "Would a sales rep want to contact this buyer after reading this?"

## TONE
- Confident but cautious
- Professional export consultant
- No hype, no marketing fluff

## OUTPUT FORMAT (STRICT)
You MUST output in this exact format with these section headers:

[바이어 개요]
Write 3–5 sentences explaining:
- Who this buyer is
- What kind of business they operate
- Their customer base
- Their positioning in their local market

[주요 취급 제품]
List major product categories the buyer handles.
Focus only on items that matter for OUR products.
(This is the ONLY section where bullet points are allowed)

[제안 가능성]
Explain clearly in paragraph form:
- Why OUR product can be proposed to this buyer
- How it creates synergy with their existing business
- How it could be used (in-store, resale, B2B, experience, etc.)
- Why this buyer makes sense *now*

[고객사 제품과의 유사 품목 취급 여부]
Answer explicitly in paragraph form:
- Whether the buyer already handles similar or complementary products
- Why this increases or decreases sales feasibility

IMPORTANT:
- Write as if this memo will be read by a sales manager.
- Be specific.
- Avoid vague statements.
- Do NOT use bullet points except in "주요 취급 제품".
- You MUST perform web research about the buyer using search.`;

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
    const grokApiKey = Deno.env.get('Buyer_Analysis');
    
    if (!grokApiKey) {
      console.error('Missing Buyer_Analysis secret');
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

    const { buyerId, buyerName, buyerWebsite, buyerCountry, buyerDescription } = await req.json();

    if (!buyerId || !buyerName) {
      return new Response(JSON.stringify({ error: 'Missing buyerId or buyerName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing buyer: ${buyerName} for user: ${user.id}`);

    // Fetch company survey data
    const { data: surveyData, error: surveyError } = await supabase
      .from('company_surveys')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (surveyError && surveyError.code !== 'PGRST116') {
      console.error('Survey fetch error:', surveyError);
    }

    // Fetch company products
    let products: any[] = [];
    if (surveyData?.id) {
      const { data: productsData } = await supabase
        .from('company_products')
        .select('*')
        .eq('survey_id', surveyData.id);
      products = productsData || [];
    }

    // Fetch latest strategy report
    const { data: strategyData, error: strategyError } = await supabase
      .from('strategy_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (strategyError && strategyError.code !== 'PGRST116') {
      console.error('Strategy fetch error:', strategyError);
    }

    // Build context from company data
    const companyContext = buildCompanyContext(surveyData, products, strategyData);

    // Build buyer info
    const buyerInfo = {
      name: buyerName,
      website: buyerWebsite || '정보 없음',
      country: buyerCountry || '정보 없음',
      description: buyerDescription || '정보 없음',
    };

    // Build user prompt
    const userPrompt = buildUserPrompt(companyContext, buyerInfo);

    console.log('Calling Grok API for buyer analysis...');

    // Call Grok API with web search
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${grokApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        search_parameters: {
          mode: "auto",
          return_citations: true,
          max_search_results: 15,
        },
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      console.error("Grok API error:", status, errorText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'AI 서비스가 일시적으로 바쁩니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402 || status === 403) {
        return new Response(JSON.stringify({ error: 'AI 서비스 결제가 필요합니다.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Grok API error (${status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("Grok API response received");

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in Grok response");
    }

    // Save to sales_activity_logs
    const activityTitle = `바이어 분석: ${buyerName}`;
    const now = new Date().toISOString();

    const { data: logData, error: logError } = await supabase
      .from('sales_activity_logs')
      .insert({
        buyer_id: buyerId,
        source: 'ai_analysis',
        direction: 'internal',
        title: activityTitle,
        content: content,
        occurred_at: now,
        created_by: user.id,
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to save activity log:', logError);
      // Don't fail the request, just log the error
    } else {
      console.log('Activity log saved:', logData?.id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      analysis: content,
      activity_log_id: logData?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analyze buyer error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildCompanyContext(survey: any, products: any[], strategy: any): string {
  const lines: string[] = [];
  
  lines.push('=== 우리 회사 정보 ===');
  
  if (survey) {
    if (survey.company_website) {
      lines.push(`회사 웹사이트: ${survey.company_website}`);
    }
    if (survey.company_description) {
      lines.push(`회사 설명: ${survey.company_description}`);
    }
    if (survey.year_founded) {
      lines.push(`설립연도: ${survey.year_founded}`);
    }
    if (survey.employee_count) {
      lines.push(`직원 수: ${survey.employee_count}`);
    }
    if (survey.core_strengths) {
      lines.push(`핵심 강점: ${survey.core_strengths}`);
    }
    if (survey.export_experience) {
      const expMap: Record<string, string> = {
        'direct': '직접 수출 경험 있음',
        'indirect': '간접 수출 경험 있음',
        'no_experience': '수출 경험 없음',
      };
      lines.push(`수출 경험: ${expMap[survey.export_experience] || survey.export_experience}`);
    }
    if (survey.existing_markets?.length > 0) {
      lines.push(`기존 수출 시장: ${survey.existing_markets.join(', ')}`);
    }
    if (survey.target_regions?.length > 0) {
      const regionMap: Record<string, string> = {
        north_america: '북미',
        europe: '유럽',
        southeast_asia: '동남아시아',
        middle_east: '중동',
        east_asia: '동아시아',
        others: '기타 지역',
      };
      const regions = survey.target_regions.map((r: string) => regionMap[r] || r);
      lines.push(`목표 수출 지역: ${regions.join(', ')}`);
    }
    if (survey.certifications?.length > 0) {
      lines.push(`보유 인증: ${survey.certifications.join(', ')}`);
    }
    if (survey.catalog_file_url) {
      lines.push(`제품 카탈로그: ${survey.catalog_file_url}`);
    }
    if (survey.intro_file_url) {
      lines.push(`회사 소개서: ${survey.intro_file_url}`);
    }
  } else {
    lines.push('(회사 설문 데이터 없음)');
  }

  if (products.length > 0) {
    lines.push('');
    lines.push('=== 우리 제품 ===');
    products.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.product_name}: ${p.product_description || '설명 없음'}`);
    });
  }

  if (strategy) {
    lines.push('');
    lines.push('=== 수출 전략 분석 결과 (요약) ===');
    if (strategy.product_name) {
      lines.push(`분석 대상 제품: ${strategy.product_name}`);
    }
    if (strategy.target_regions?.length > 0) {
      lines.push(`전략 목표 지역: ${strategy.target_regions.join(', ')}`);
    }
    // Include key parts of the strategy report if available
    if (strategy.content) {
      // Extract just the executive summary or first part
      const contentLines = strategy.content.split('\n').slice(0, 30).join('\n');
      lines.push(`전략 보고서 요약:\n${contentLines}`);
    }
  } else {
    lines.push('');
    lines.push('(수출 전략 분석 결과 없음 - /strategy 페이지에서 전략 분석을 먼저 수행하시면 더 정확한 바이어 분석이 가능합니다)');
  }

  return lines.join('\n');
}

function buildUserPrompt(companyContext: string, buyer: { name: string; website: string; country: string; description: string }): string {
  return `[우리 회사 컨텍스트]
${companyContext}

[분석 대상 바이어 정보]
- 바이어명: ${buyer.name}
- 웹사이트: ${buyer.website}
- 국가: ${buyer.country}
- 설명: ${buyer.description}

[당신의 임무]
위 바이어가 우리 회사의 제품과 수출 전략에 얼마나 적합한지 분석해주세요.

반드시 다음 사항을 수행하세요:
1. 바이어의 공식 웹사이트, 온라인 스토어, 뉴스, LinkedIn 등을 웹 검색하여 조사하세요.
2. 우리 회사의 제품, 목표 시장, 타겟 바이어 유형, 영업 전략 방향을 고려하세요.
3. 이 바이어가 우리 제품의 잠재 고객인지, 왜 그런지 구체적으로 설명하세요.

[출력 형식 - 반드시 준수]
다음 4개의 섹션으로 작성하세요:

[바이어 개요]
(3-5문장으로 바이어가 누구인지, 어떤 사업을 하는지, 고객층은 누구인지, 현지 시장에서의 포지셔닝은 어떤지 설명)

[주요 취급 제품]
(우리 제품과 관련된 주요 제품 카테고리를 bullet point로 나열)

[제안 가능성]
(왜 우리 제품을 이 바이어에게 제안할 수 있는지, 어떤 시너지가 있는지, 어떻게 활용될 수 있는지, 왜 지금 이 바이어인지 문단 형식으로 설명)

[고객사 제품과의 유사 품목 취급 여부]
(바이어가 이미 유사하거나 보완적인 제품을 취급하는지, 이것이 영업 가능성을 높이는지 낮추는지 문단 형식으로 설명)

중요: 이 메모는 영업 관리자가 읽을 것입니다. 구체적으로 작성하고, 막연한 진술은 피하세요.`;
}
