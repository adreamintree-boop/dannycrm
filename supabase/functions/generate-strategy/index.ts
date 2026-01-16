import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRATEGY_CREDIT_COST = 10;
const MODEL_NAME = 'sonar';
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
    const perplexityApiKey = Deno.env.get('TaaS_AI_CORE_TEST');
    
    if (!perplexityApiKey) {
      console.error('Missing TaaS_AI_CORE_TEST secret');
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

1. 근거 없는 정보 생성(환각)을 절대 하지 않는다.

2. 확인 불가 정보는 반드시 "알 수 없음" 또는 "(추정)"으로 명확히 표기한다.

3. 실제 존재하지 않는 기업, 시장, 통계, 인증, 규제 정보를 생성하지 않는다.

4. 수치·통계·시장 정보는 최근 3년 기준을 우선한다.

5. 모든 분석 결과는 전략 참고용이며,

   법적·재무적·투자 판단의 효력을 갖지 않는다.

사고 방식 강제 규칙:

- 모든 분석은 "일반론"이 아닌 "해당 기업 기준"으로 해석한다.

- 글로벌 평균 또는 업계 표준 대비,

  이 기업의 상대적 위치를 항상 고려한다.

- 전략 제안은 많지 않아도 되나,

  반드시 실행 가능성과 우선순위를 포함해야 한다.

언어 규칙:

- 출력 언어는 User Payload에 전달된 language 값을 따른다.

- language가 "auto"인 경우,

  User Payload의 user_country 정보를 기준으로

  가장 적절한 언어를 선택한다.

중요:

너의 출력물은

경영진, 해외영업 책임자, 실무자가

"이 보고서 하나로 다음 액션을 결정할 수 있는 수준"이어야 한다.`;

    // Developer Prompt - 문단형 보고서 + Internal JSON 형식
    const developerPrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[출력 언어 및 기본 제어 규칙]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 출력 언어는 User Payload의 context.language 값을 따른다.

2. context.language가 "auto" 인 경우, context.user_country 기준으로 출력 언어를 자동 결정한다.

언어 매핑 규칙:

- KR → 한국어(ko)

- JP → 일본어(ja)

- CN → 중국어 간체(zh)

- TW → 중국어 번체(zh-TW)

- 그 외 국가 → 영어(en)

국가명 표기 규칙:

- 국가명은 반드시 정식 한글 또는 해당 언어의 정식 명칭으로 표기한다.

- 미국, 캐나다, 독일, 프랑스, 영국, 베트남, 태국, 싱가포르와 같이 작성한다.

- US, CA, DE, VN, TH 등의 ISO 국가 코드 사용은 절대 금지한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[보고서 작성의 절대 원칙]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

너는 TradeIt SaaS의 "수출 전략 및 시장조사 전문 컨설턴트"다.

너의 임무는 체크리스트, 요약 노트, 내부 메모가 아니라

정부·공공기관·대기업에 제출 가능한

'문단형 수출 전략 및 시장조사 보고서'를 작성하는 것이다.

본 보고서는 사람이 읽는 문서이며,

모든 내용은 자연스러운 문단(paragraph) 서술로 구성되어야 한다.

- 단순 정보 요약이나 나열은 감점 대상이다.

- 모든 섹션은 사실(Fact) → 해석(Interpretation) → 전략적 판단(Implication)의 흐름을 문장 안에 반드시 포함해야 한다.

- "~할 수 있다", "~로 보인다"와 같은 회피적 표현은 최소화하고, 판단의 이유를 명확히 서술한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[출력 형식 규칙 – 매우 중요]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 전체 출력은 Markdown 기반의 분석 리포트 형식으로 작성한다.

2. 본문(1~7장)은 전부 문단형 서술로만 작성한다.

3. 불릿포인트, 번호 나열, 리스트, JSON, 워크시트 형식은 본문에서 전면 금지한다.

4. 각 소주제(예: 2.1, 4.3 등)는 반드시 2~4개의 문단으로 구성한다.

5. 각 문단은 아래 요소를 자연스럽게 포함해야 한다.

   - 관찰된 사실

   - 그 사실의 의미

   - 전략적 시사점 또는 판단

사용 금지 표현:

- "Key Findings", "Interpretation", "Recommendations"

- "요약하면", "정리하면"

- 목록형 서술을 암시하는 표현

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[고정 목차 – 반드시 유지]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HS CODE 및 데이터 규칙]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- HS CODE는 국제 공통 기준 6자리까지만 표기한다.

- 7~10자리 국가별 세부 코드는 절대 사용하지 않는다.

- 불확실한 경우 "(추정)"을 문장 안에 명확히 포함한다.

- HS CODE는 수출 전략 판단의 근거로만 사용하며, 나열 목적 사용은 금지한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[첨부 문서 활용 규칙]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- User Payload에 회사소개서 또는 제품 카탈로그가 제공된 경우,

  해당 문서는 기업 및 제품 이해의 1차 근거로 활용한다.

- 첨부 문서 정보는 홈페이지 정보보다 우선적으로 고려할 수 있다.

- 문서 기반 정보라도 검증이 어려운 경우,

  반드시 문장으로 불확실성을 명시한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Summary JSON – 내부 연계용 / 유저 비노출]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Summary JSON은 반드시 생성한다.

- Summary JSON은 유저에게 직접 노출하지 않는다.

- 본 JSON은 EP-05(바이어 적합도 분석), EP-06(영업 이메일 스크립트)의 입력값으로만 사용된다.

- Summary JSON을 본문 설명에 직접 인용하거나 언급하지 않는다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[명시적 금지 사항]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- 존재하지 않는 통계, 기업, 시장, 인증, 링크 생성 금지

- 추정 정보를 사실처럼 단정 금지

- 본문에 리스트·JSON·워크시트 출력 금지

- Summary JSON 출력 누락 금지`;

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
      .map((p: any) => p.product_name);

    // Map target regions to country names (Korean)
    const regionToCountryNames: Record<string, string[]> = {
      'north_america': ['미국', '캐나다'],
      'europe': ['독일', '프랑스', '영국'],
      'southeast_asia': ['베트남', '태국', '싱가포르'],
      'middle_east': ['아랍에미리트', '사우디아라비아'],
      'east_asia': ['일본', '중국'],
      'others': []
    };

    const targetCountries = (survey_data.target_regions || [])
      .flatMap((r: string) => regionToCountryNames[r] || []);

    // Build user payload in the new structure
    const userPayload = {
      company: {
        name: survey_data.company_name || '(미입력)',
        homepage_url: survey_data.company_website || '',
        country: '대한민국'
      },
      products: productsArray.length > 0 ? productsArray : ['(미입력)'],
      export_context: {
        target_countries: targetCountries
      },
      materials: {
        company_profile_pdf: !!survey_data.intro_file_url,
        product_catalog_pdf: !!survey_data.catalog_file_url
      },
      context: {
        user_country: '대한민국',
        language: 'auto'
      }
    };

    // Response format instructions
    const responseFormatInstructions = `
==================================================

Hybrid Response Format

==================================================

1. User-facing Output (Human-readable Report)

==================================================

- 유저에게 노출되는 결과물임

- Markdown 기반 분석 리포트 형식

- 고정된 섹션 순서 유지

- 각 섹션은 문단 서술을 기본으로 하며, 필요 시 bullet point(최대 5개) 및 표(Table) 혼합

[섹션 구성 – 고정]

1. 기업 개요 및 제품 포지션

2. 글로벌 시장 동향 및 수출 가능성 진단

3. 주요 경쟁사 분석

4. 목표 수출 시장 분석

5. HS CODE(6자리) 및 수입 통계 분석

6. 국가별 진입 장벽 및 리스크

7. 유통 구조 및 잠재 바이어 유형

8. 수출 전략 및 실행 제안

[출력 규칙]

- bullet point 단독 나열 금지

- 표(Table)는 반드시 문단 설명 이후에 위치

- HS CODE는 국제 공통 6자리까지만 표기

- 불확실한 정보는 반드시 "(추정)" 또는 "알 수 없음"으로 명시

- 본 리포트는 전략 참고용이며 법적·재무적 효력 없음

==================================================

2. Internal Summary JSON (Hidden / Machine-readable)

==================================================

- 유저에게 노출되지 않음

- 서버/DB에 JSON 형태로 저장

- EP-05(바이어 적합도 분석), EP-06(이메일 스크립트 생성)의 입력값으로 사용

- 화면 출력 실패 여부와 관계없이 반드시 생성

응답은 아래 형식을 따라주세요:

1. 먼저 Markdown 형식의 분석 리포트를 작성합니다.

2. 리포트 마지막에 ---JSON_START--- 마커 후 Internal Summary JSON을 추가합니다.

3. JSON 형식:
{
  "company_analysis": {
    "company_profile": {
      "company_name": "string",
      "country": "string",
      "estimated_industry": "string",
      "business_type": "Manufacturer | Brand | OEM/ODM | Distributor | Mixed | Unknown"
    },
    "products_summary": [
      {
        "product_name": "string",
        "category": "string",
        "key_features": ["string"],
        "positioning_notes": "string"
      }
    ],
    "core_strengths": [
      "기술/제품/가격/인증/레퍼런스 등 핵심 강점 요약"
    ],
    "target_markets": [
      {
        "country": "string",
        "market_rationale": "선정 이유 요약",
        "market_maturity": "Emerging | Growing | Mature"
      }
    ],
    "hs_codes_6digit": [
      {
        "hs_code": "string",
        "product_mapping": "해당 HS CODE가 연결되는 제품군",
        "confidence": "Confirmed | Estimated"
      }
    ],
    "regulatory_risk": {
      "overall_level": "Low | Medium | High",
      "notes": "인증·규제 관련 핵심 유의사항 요약"
    },
    "export_readiness": {
      "level": "Low | Medium | High",
      "rationale": "현재 수출 준비도 판단 근거"
    },
    "recommended_strategy_angles": [
      "향후 영업·시장 접근 시 활용 가능한 전략 포인트"
    ]
  },
  "meta": {
    "analysis_version": "ep04_core_v1",
    "language": "ko",
    "materials_used": {
      "homepage": true,
      "company_profile_pdf": true,
      "product_catalog_pdf": true
    },
    "generated_at": "ISO-8601 timestamp"
  }
}`;

    const userPrompt = `[USER PAYLOAD]
${JSON.stringify(userPayload, null, 2)}

[추가 정보]
회사 설명: ${survey_data.company_description || '(미입력)'}
설립연도: ${survey_data.year_founded || '(미입력)'}
직원 수: ${survey_data.employee_count || '(미입력)'}
핵심 강점: ${survey_data.core_strengths || '(미입력)'}
수출 경험: ${exportExpMapped}
기존 수출 시장: ${(survey_data.existing_markets || []).join(', ') || '없음'}
인증: ${(survey_data.certifications || []).join(', ') || '없음'}
제품 카탈로그: ${survey_data.catalog_file_url ? '첨부됨' : '없음'}
회사 소개서: ${survey_data.intro_file_url ? '첨부됨' : '없음'}

${responseFormatInstructions}

[INSTRUCTIONS]
1. Developer Prompt의 7개 챕터 고정 구조를 반드시 따르세요.
2. context.language가 "auto"이고 context.user_country가 "대한민국"이므로 한국어로 작성하세요.
3. 국가명은 반드시 정식 한글 명칭으로 표기하세요 (ISO 코드 금지).
4. Markdown 리포트 작성 후, ---JSON_START--- 마커 다음에 Internal Summary JSON을 추가하세요.`;

    console.log('Calling Perplexity Sonar AI for strategy generation...');

    // Call Perplexity Sonar API with TaaS_AI_CORE_TEST
    const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt + '\n\n' + developerPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: TEMPERATURE,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Perplexity AI error:', aiResponse.status, errorText);
      
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
    console.log('Perplexity AI response received, length:', JSON.stringify(aiData).length);

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

    // Parse response - split markdown report and internal JSON
    let reportMarkdown = rawContent;
    let internalJson: any = null;
    
    const jsonMarker = '---JSON_START---';
    const jsonMarkerIndex = rawContent.indexOf(jsonMarker);
    
    if (jsonMarkerIndex !== -1) {
      reportMarkdown = rawContent.substring(0, jsonMarkerIndex).trim();
      let jsonPart = rawContent.substring(jsonMarkerIndex + jsonMarker.length).trim();
      
      // Clean up JSON part
      if (jsonPart.startsWith('```json')) {
        jsonPart = jsonPart.slice(7);
      } else if (jsonPart.startsWith('```')) {
        jsonPart = jsonPart.slice(3);
      }
      if (jsonPart.endsWith('```')) {
        jsonPart = jsonPart.slice(0, -3);
      }
      jsonPart = jsonPart.trim();
      
      try {
        internalJson = JSON.parse(jsonPart);
        console.log('Internal JSON parsed successfully');
      } catch (parseError) {
        console.error('Failed to parse internal JSON:', parseError);
        // Continue without internal JSON - report is still usable
      }
    }

    // Get citations from Perplexity response
    const citations = aiData.citations || [];

    console.log('Strategy generated successfully, markdown length:', reportMarkdown.length);

    // Prepare report_json for storage
    const reportJson = {
      report_markdown: reportMarkdown,
      internal_summary: internalJson,
      citations: citations,
      model: MODEL_NAME,
      generated_at: new Date().toISOString()
    };

    // Save the report to database
    const { data: reportData, error: reportError } = await supabase
      .from('strategy_reports')
      .insert({
        user_id: userId,
        survey_id: survey_data.id || null,
        content: reportMarkdown,
        report_json: reportJson,
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
      report_json: reportJson,
      report_id: reportData?.id,
      new_balance: creditResult.new_balance,
      deducted: STRATEGY_CREDIT_COST,
      citations: citations
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
