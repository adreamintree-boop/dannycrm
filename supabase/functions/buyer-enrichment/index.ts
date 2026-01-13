import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_CREDIT_COST = 5;

// System prompt (verbatim from user spec)
const SYSTEM_PROMPT = `너는 TradeIt SaaS의 Data Enrichment AI다.

목표는 입력으로 주어진 바이어 단서를 기반으로, 웹 검색 근거를 사용해 바이어 기본 정보를 보강하는 것이다.

출력은 반드시 지정된 JSON 스키마만 반환한다.

금지사항

1. 근거 없는 정보 생성(환각) 금지

2. 공식·법적 효력이 있는 정보처럼 단정 금지

3. 출처가 없는 이메일/전화/주소 채우기 금지

출처 및 충돌 규칙

- 동일 항목이 여러 출처에서 발견될 수 있다.

- 공식 홈페이지는 항상 최우선 출처(primary source)다.

- Facebook 페이지는 공식 보조 출처(secondary source)로 취급한다.

- 충돌 시 우선순위에 따라 대표 값을 선택하되, 다른 값도 evidence로 기록한다.

출력 규칙

- 채워진 모든 필드는 evidence를 포함해야 한다.

- 확인 불가한 항목은 null로 남긴다.

- summary에는 "참고용 정보"임을 명확히 표시한다.`;

// Developer prompt (verbatim from user spec)
const DEVELOPER_PROMPT = `[이메일 유형 구분]

1. 처리 우선순위 (절대 규칙)

아래 항목은 반드시 이 순서로 탐색·판단·채택한다.

1) 공식 홈페이지 → website_url (최우선)

2) Contact 정보

- email_address

- phone_number_e164

3)구글맵 주소 → address

4) Facebook 페이지 → facebook_url

5) LinkedIn 페이지 → linkedin_url

이 우선순위는 "출력 순서"가 아니라 대표값 선정 및 신뢰도 판단의 기준이다.

2. 공식 홈페이지 (website_url) 판단 규칙

2.1 채우기 원칙

- website_url은 가장 가능성이 높은 공식 홈페이지 1개만 채운다.

- 후보가 여러 개인 경우, 가장 신뢰도가 높은 1개만 선택한다.

2.2 "공식 홈페이지" 판단 기준

아래 기준을 복수 충족할수록 신뢰도를 높인다.

- 회사명(buyer_name)과 도메인 명칭의 강한 일치

- buyer.country 또는 국가 코드와의 일치

- 검색 스니펫에 "Official", "Company", "About us" 등의 신뢰 신호 존재

- Facebook/LinkedIn 페이지에서 공식 홈페이지로 상호 링크됨

2.3 제한

- 마켓플레이스, 디렉토리, 뉴스 기사, 위키 URL은 공식 홈페이지로 인정하지 않는다.

- 확신이 부족할 경우:

1) website_url = null

2) confidence_level = Low

3. Contact 정보 처리 규칙 (email / phone)

Contact 정보는 출처별로 복수 존재할 수 있으며,

대표값 1개만 CRM에 기입하고, 나머지는 evidence로만 보존한다.

3.1 Contact 정보 탐색 순서

1) 공식 홈페이지

- Contact / About / Footer / Support 페이지

2) Facebook 공식 페이지

- About / Contact Info 섹션

LinkedIn은 Contact 정보 추출 소스로 사용하지 않는다.

3.2 email_address 처리 규칙

채우기 조건

- 아래 출처 중 하나에서 명확히 확인 가능한 경우에만 채운다.

1) 공식 홈페이지

2) Facebook 공식 페이지

대표값 선정 규칙

- 공식 홈페이지 이메일 존재 → 대표 이메일

- 홈페이지에는 없고 Facebook에만 존재 → Facebook 이메일 사용

- 홈페이지와 Facebook 모두 존재하나 서로 다른 경우:

1) 대표 이메일: 공식 홈페이지

2) Facebook 이메일: 대표값으로 사용하지 않음(evidence로만 기록)

품질 판단

- 홈페이지 도메인과 이메일 도메인이 일치하면 신뢰도 상승

- 무료 이메일(gmail, yahoo 등)만 존재할 경우 confidence 하향

3.3 phone_number_e164 처리 규칙 (핵심 · 엄격)

채우기 조건

- 공식 홈페이지 또는 Facebook에서 전화번호가 명시된 경우에만 채운다.

3.3.1 E.164 정규화 규칙

전화번호는 반드시 E.164 형식(+국가번호 + 지역번호/번호) 으로 저장한다.

정규화 절차 (순서 중요)

1) 원본 전화번호에서 공백, 하이픈, 괄호 제거

2) 전화번호가 이미 +로 시작하는 경우

- 그대로 사용 (유효성만 확인)

3) 전화번호가 + 없이 시작하며, buyer.country_calling_code가 제공된 경우:

- 국가번호를 앞에 붙인다

- 이때, 전화번호의 첫 자리가 0으로 시작하면 해당 0은 제거

- 예시:

원본: 0212345678

국가번호: +82

결과: +82212345678

4) 전화번호가 + 없이 시작하고, buyer.country_calling_code가 제공되지 않은 경우:

- 전화번호를 채우지 않는다 (null)

- 국가번호 추정 금지

3.3.2 출처 충돌 시 규칙

- 공식 홈페이지 전화번호 → 대표값

- Facebook 전화번호 → 보조 출처(evidence로만 기록)

4. 주소(address) 처리 규칙

채우기 조건

- 아래 중 하나의 근거가 있을 경우에만 채운다.

1) Google Maps 검색 결과

2) 공식 홈페이지에 명시된 주소

범위

- 국가/도시 수준 정보만 확인되어도 가능

- 주소 형식은 검색 결과 원문을 따른다.

제한

- 주소 추정 또는 조합 금지

- 근거가 없으면 null 유지

5. SNS 페이지 처리 규칙

facebook_url

- 공식 페이지로 판단 가능한 경우에만 채운다.

- 판단 기준:

1) 회사명 일치

2) 공식 홈페이지에서 링크

3) 동일 브랜드/도메인 언급

linkedin_url

- 공식 회사 페이지로 판단 가능한 경우에만 채운다.

- Contact 정보 추출은 하지 않는다.

6. 출력 품질 규칙

enrichment_summary

- 길이: 400~800자 (한국어 기준)

- 반드시 포함할 내용:

1) 기업의 추정 업종/성격

2) 국가/도시

3) 확인된 주요 접점 채널(홈페이지, 이메일, 전화 여부)

4) 불확실성 또는 주의사항 요약

confidence_level 판단 기준

- High:

1) 공식 홈페이지 확인

2) 이메일 또는 전화 중 1개 이상 명확

- Medium:

1) 공식 홈페이지는 확실

2) Contact 정보는 Facebook 기반 또는 일부만 확인

- Low:

1) 공식 홈페이지 불확실

2) 동명이인 가능성 높음

3) Contact 정보 대부분 미확인

7. 실패 / 폴백 규칙

7.1 공식 홈페이지를 특정하지 못한 경우:

- website_url = null

- confidence_level = Low

- enrichment_summary에 반드시 포함:

1) "추가 확인 필요" 문구

2) 필요한 추가 단서 2~3개

2-1) 정확한 법인명

2-2) 도시 정보

2-3) 제품/산업 정보

8. 명시적 제외 사항

- contact_info 필드는 사용하지 않는다

- 추정 이메일/전화/주소 생성 금지

- JSON 스키마 외 텍스트 출력 금지

- "확정", "공식 보장" 등의 표현 금지

9. 출력 JSON 스키마 (이것만 반환)

{
  "website_url": "string | null",
  "facebook_url": "string | null",
  "linkedin_url": "string | null",
  "youtube_url": "string | null",
  "address": "string | null",
  "email_address": "string | null",
  "phone_number_e164": "string | null",
  "enrichment_summary": "string (400-800자 한국어)",
  "confidence_level": "High | Medium | Low",
  "evidence": {
    "website_url": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}],
    "facebook_url": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}],
    "linkedin_url": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}],
    "youtube_url": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}],
    "address": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}],
    "email_address": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}],
    "phone_number_e164": [{"source_type":"website|facebook|linkedin|google_maps","source_url":"string","snippet":"string"}]
  }
}`;

interface EnrichmentInput {
  buyer_id: string;
  buyer_name: string;
  country: string | null;
  country_calling_code: string | null;
  existing: {
    website_url: string | null;
    facebook_url: string | null;
    linkedin_url: string | null;
    youtube_url: string | null;
    address: string | null;
    email_address: string | null;
    phone_number_e164: string | null;
  };
}

interface EnrichmentOutput {
  website_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  address: string | null;
  email_address: string | null;
  phone_number_e164: string | null;
  enrichment_summary: string;
  confidence_level: "High" | "Medium" | "Low";
  evidence: {
    website_url?: Array<{ source_type: string; source_url: string; snippet: string }>;
    facebook_url?: Array<{ source_type: string; source_url: string; snippet: string }>;
    linkedin_url?: Array<{ source_type: string; source_url: string; snippet: string }>;
    youtube_url?: Array<{ source_type: string; source_url: string; snippet: string }>;
    address?: Array<{ source_type: string; source_url: string; snippet: string }>;
    email_address?: Array<{ source_type: string; source_url: string; snippet: string }>;
    phone_number_e164?: Array<{ source_type: string; source_url: string; snippet: string }>;
  };
}

async function callGrokForEnrichment(input: EnrichmentInput): Promise<EnrichmentOutput> {
  const GROK_API_KEY = Deno.env.get("OPENAI_API_KEY");

  if (!GROK_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Build user message with input data
  const existingFieldsText = Object.entries(input.existing)
    .filter(([_, v]) => v && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const userMessage = `바이어 정보 보강 요청

## 바이어 정보
- buyer_name: "${input.buyer_name}"
- country: "${input.country || "Unknown"}"
- country_calling_code: "${input.country_calling_code || "Unknown"}"

## 기존 데이터 (이미 존재하는 필드):
${existingFieldsText || "없음"}

## 요청
위 바이어에 대해 웹 검색을 수행하고, 지정된 JSON 스키마로 결과를 반환하세요.
기존 데이터가 있는 필드는 검증만 하고, 없는 필드는 채우세요.
근거가 없으면 null을 반환하세요.`;

  console.log("Calling Grok API for buyer enrichment:", input.buyer_name);

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4-1-fast-reasoning",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "developer", content: DEVELOPER_PROMPT },
        { role: "user", content: userMessage },
      ],
      search_parameters: {
        mode: "auto",
        return_citations: true,
        max_search_results: 10,
      },
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const status = response.status;
    console.error("Grok API error:", status, errorText);
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402 || status === 403) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`Grok API error (${status}): ${errorText}`);
  }

  const data = await response.json();
  console.log("Grok API raw response:", JSON.stringify(data, null, 2));

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in Grok response");
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonContent = content;
  if (content.includes("```json")) {
    jsonContent = content.split("```json")[1].split("```")[0].trim();
  } else if (content.includes("```")) {
    jsonContent = content.split("```")[1].split("```")[0].trim();
  }

  try {
    const result = JSON.parse(jsonContent) as EnrichmentOutput;
    console.log("Parsed enrichment result:", JSON.stringify(result, null, 2));
    
    // Ensure null values for empty strings
    const cleanResult: EnrichmentOutput = {
      website_url: result.website_url || null,
      facebook_url: result.facebook_url || null,
      linkedin_url: result.linkedin_url || null,
      youtube_url: result.youtube_url || null,
      address: result.address || null,
      email_address: result.email_address || null,
      phone_number_e164: result.phone_number_e164 || null,
      enrichment_summary: result.enrichment_summary || "",
      confidence_level: result.confidence_level || "Low",
      evidence: result.evidence || {},
    };
    
    return cleanResult;
  } catch (parseError) {
    console.error("Failed to parse Grok response as JSON:", content);
    throw new Error("Failed to parse AI response");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const input: EnrichmentInput = await req.json();

    if (!input.buyer_id || !input.buyer_name) {
      return new Response(
        JSON.stringify({ error: "buyer_id and buyer_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Enriching buyer: ${input.buyer_name} (${input.buyer_id}) for user: ${user.id}`);

    // Check credits
    const { data: creditData, error: creditError } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (creditError || !creditData) {
      console.error("Credit check error:", creditError);
      return new Response(
        JSON.stringify({ error: "크레딧 정보를 확인할 수 없습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (creditData.balance < ENRICH_CREDIT_COST) {
      return new Response(
        JSON.stringify({ 
          error: `크레딧이 부족합니다.`,
          required: ENRICH_CREDIT_COST,
          balance: creditData.balance
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Grok API for enrichment
    let enrichedData: EnrichmentOutput;
    
    try {
      enrichedData = await callGrokForEnrichment(input);
      console.log("Enrichment result:", enrichedData);
    } catch (aiError) {
      console.error("Grok API failed:", aiError);

      const errMsg = aiError instanceof Error ? aiError.message : "";
      if (errMsg === "RATE_LIMITED") {
        return new Response(
          JSON.stringify({
            error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (errMsg === "PAYMENT_REQUIRED") {
        return new Response(
          JSON.stringify({
            error: "AI API 한도를 초과했습니다. 관리자에게 문의해주세요.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine if we should charge credits (only if useful data found)
    const hasUsefulData = 
      enrichedData.website_url || enrichedData.address || enrichedData.phone_number_e164 || 
      enrichedData.email_address || enrichedData.facebook_url || enrichedData.linkedin_url;
    
    const creditsToCharge = hasUsefulData ? ENRICH_CREDIT_COST : 0;
    let newBalance = creditData.balance;

    if (creditsToCharge > 0) {
      // Generate a unique request ID for idempotency
      const requestId = crypto.randomUUID();
      
      const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: creditsToCharge,
        p_action_type: "AI_ENRICH",
        p_request_id: requestId,
        p_meta: { buyer_id: input.buyer_id, buyer_name: input.buyer_name },
      });

      if (deductError || !deductResult?.[0]?.success) {
        console.error("Credit deduction failed:", deductError, deductResult);

        return new Response(
          JSON.stringify({ error: "크레딧 차감에 실패했습니다." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newBalance = deductResult[0].new_balance;
      console.log(`Credits deducted (${creditsToCharge}). New balance: ${newBalance}`);
    } else {
      console.log("No credits charged - no useful data found");
    }

    // Save to buyer_enrichment_runs for audit
    const { error: insertError } = await supabase
      .from("buyer_enrichment_runs")
      .insert({
        user_id: user.id,
        buyer_id: input.buyer_id,
        input_json: input,
        output_json: enrichedData,
        enrichment_summary: enrichedData.enrichment_summary,
        confidence_level: enrichedData.confidence_level,
        evidence: enrichedData.evidence,
        credit_cost: creditsToCharge,
      });

    if (insertError) {
      console.error("Failed to save enrichment run:", insertError);
      // Don't fail the request, just log
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedData,
        newBalance,
        creditCost: creditsToCharge,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Buyer enrichment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
