import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_CREDIT_COST = 5;

const normalizeBaseUrl = (url?: string | null) => {
  const trimmed = (url ?? "").trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : null;
};

// B2B Company Enrichment Agent system prompt
const ENRICHMENT_SYSTEM_PROMPT = `You are a B2B Company Enrichment Agent specialized in buyer discovery.

IMPORTANT SEARCH RULES (MANDATORY):

1. Company Name Normalization
- Always normalize the company name before searching.
- Remove legal suffixes such as:
  "CORPORATION", "CORP", "INC", "LLC", "LTD", "CO.", "COMPANY"
- Example:
  Input: "BINEX LINE CORPORATION"
  Normalized search terms:
  - "BINEX LINE"
  - "BINEX"

2. Search Expansion Strategy
- If an exact match is not found, you MUST broaden the search using:
  - normalized name
  - shortened name
  - brand-style name
  - domain-based guess ONLY if found in evidence (never guess blindly)
- You are allowed to match companies where:
  - official website brand ≠ legal entity name
  - contact page does not show full legal suffix

3. Country Handling
- country_hint is a soft constraint, NOT a hard filter.
- If strong evidence exists outside the hinted country, still return it with explanation.

4. Evidence Priority
- Highest priority:
  - Official company website
  - Official contact/about page
- Secondary:
  - Logistics directories
  - Business registries
  - Reputable B2B platforms
- Never fabricate.

5. Failure Policy
- You must NOT return "no_data" unless:
  - At least 3 different normalized search attempts fail.
- If multiple plausible matches exist:
  - Return status="needs_confirmation"
  - Provide candidates.

OUTPUT RULES:
- Output STRICT JSON only.
- Follow the schema exactly.
- Do not overwrite existing non-empty fields.
- Confidence scoring:
  - 100 = verified on official company website or verified social profile.
  - 90 = consistent across multiple reputable business directories.
  - 70 = appears plausible but only one non-official source.
  - 50 or below = weak/ambiguous → return null.
- Email policy: Only return an email if explicitly shown on official site/contact page or reliable directory. Never guess patterns like info@domain.com.
- credits_to_charge: always 5 when status="ok" and at least one field has confidence>=70; otherwise 0.`;

// JSON schema for the enrichment tool
const ENRICHMENT_TOOL_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["ok", "needs_confirmation", "no_data"],
      description: "Result status of the enrichment attempt",
    },
    credits_to_charge: {
      type: "number",
      description: "5 if status=ok and at least one field has confidence>=70; otherwise 0",
    },
    company_identity: {
      type: "object",
      properties: {
        input_name: { type: "string", description: "Original company name provided" },
        normalized_name: { type: "string", description: "Cleaned/normalized company name" },
        country_hint: { type: "string", description: "Country hint provided or inferred" },
        matched_name: { type: "string", description: "Official company name found" },
        match_confidence: { type: "number", description: "0-100 confidence in company match" },
      },
      required: ["input_name", "normalized_name", "country_hint", "matched_name", "match_confidence"],
    },
    recommended_fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: ["address", "website", "phone", "email", "facebook_url", "linkedin_url", "youtube_url", "company_description", "industry", "products", "employee_size", "revenue_range"],
          },
          current_value: { type: ["string", "null"], description: "Current value if exists" },
          suggested_value: { type: ["string", "null"], description: "New suggested value or null" },
          confidence: { type: "number", description: "0-100 confidence score" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source_type: {
                  type: "string",
                  enum: ["official_website", "linkedin", "facebook", "business_directory", "government_registry", "other"],
                },
                source: { type: "string", description: "URL or name of source" },
                quote: { type: "string", description: "Relevant excerpt from source" },
              },
              required: ["source_type", "source"],
            },
          },
        },
        required: ["field", "current_value", "suggested_value", "confidence", "evidence"],
      },
    },
    candidates: {
      type: "array",
      description: "Only populated when status=needs_confirmation",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          website: { type: "string" },
          country: { type: "string" },
          why_candidate: { type: "string", description: "Why this might be the company" },
        },
        required: ["name", "website", "country", "why_candidate"],
      },
    },
    analysis_note: {
      type: "string",
      description: "1-3 sentence summary of enrichment decision",
    },
  },
  required: ["status", "credits_to_charge", "company_identity", "recommended_fields", "candidates", "analysis_note"],
};

async function enrichBuyerWithLovableAI(args: {
  buyerName: string;
  buyerCountry?: string;
  existingFields?: Record<string, unknown>;
  hints?: Record<string, unknown>;
}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Build existing fields context
  const existing = args.existingFields || {};
  const existingFieldsText = Object.entries(existing)
    .filter(([_, v]) => v && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const userPrompt = `Enrich this buyer company for our CRM.

SEARCH INSTRUCTIONS:
- Normalize the company name by removing legal suffixes.
- Perform expanded search using shortened and brand-style names if needed.
- Do NOT fail early. Try multiple variations before returning no_data.

Input buyer:
- original_company_name: "${args.buyerName}"
- country_hint (from B/L destination): "${args.buyerCountry || "Unknown"}"

Existing fields (do not overwrite):
${existingFieldsText ? existingFieldsText : "- address: null\n- website: null\n- phone: null\n- email: null"}

${(args.hints as any)?.hs_code ? `Product HS Code: ${(args.hints as any).hs_code}` : ""}
${(args.hints as any)?.product_desc ? `Product Description: ${(args.hints as any).product_desc}` : ""}

Return result strictly in the defined JSON schema.
Use the enrich_company tool to return the structured enrichment result.`;

  console.log("Lovable AI user prompt:", userPrompt);

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "enrich_company",
            description: "Return structured B2B company enrichment result with confidence scores and evidence",
            parameters: ENRICHMENT_TOOL_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "enrich_company" } },
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    const status = aiResponse.status;
    console.error("Lovable AI error:", status, errorText);
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI API error (${status}): ${errorText}`);
  }

  const aiData = await aiResponse.json();
  console.log("Lovable AI raw response:", JSON.stringify(aiData, null, 2));

  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function?.name !== "enrich_company") {
    throw new Error("No valid tool call received");
  }

  const result = JSON.parse(toolCall.function.arguments);
  console.log("Parsed enrichment result:", JSON.stringify(result, null, 2));

  return result;
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
    const aiGatewayUrl = normalizeBaseUrl(Deno.env.get("AI_GATEWAY_URL"));
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

    const { buyerId, buyerName, buyerCountry, existingFields, hints } = await req.json();

    if (!buyerId || !buyerName) {
      return new Response(
        JSON.stringify({ error: "buyerId and buyerName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Enriching buyer: ${buyerName} (${buyerId}) for user: ${user.id}`);

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

    // Create ai_requests entry with pending status
    const inputJson = { buyerId, buyerName, buyerCountry, existingFields, hints };
    const { data: requestData, error: requestError } = await supabase
      .from("ai_requests")
      .insert({
        user_id: user.id,
        type: "buyer_enrich",
        buyer_id: buyerId,
        credit_cost: ENRICH_CREDIT_COST,
        status: "pending",
        input_json: inputJson,
      })
      .select("id")
      .single();

    if (requestError) {
      console.error("Failed to create ai_request:", requestError);
      return new Response(
        JSON.stringify({ error: "요청 기록에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiRequestId = requestData.id;
    console.log("Created ai_request:", aiRequestId);

    // Determine which AI endpoint to use (external gateway if available, otherwise Lovable AI)
    let enrichedData: any | undefined;

    if (aiGatewayUrl) {
      console.log("Calling external AI Gateway:", `${aiGatewayUrl}/buyer-enrich`);

      try {
        const gatewayInput = {
          buyerId,
          buyerName,
          buyerCountry,
          existingFields,
          hints,
        };

        // NOTE: This gateway currently forwards to the OpenAI Responses API, which requires `model` + `input`.
        const aiResponse = await fetch(`${aiGatewayUrl}/buyer-enrich`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            input: `Return ONLY valid JSON with keys: country,address,website,phone,email,facebook_url,linkedin_url,youtube_url,notes,confidence(address,website,phone,email in 0-1).\n\nBuyer context JSON:\n${JSON.stringify(gatewayInput)}`,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI Gateway returned ${aiResponse.status}: ${errorText}`);
        }

        enrichedData = await aiResponse.json();
        console.log("External AI Gateway response:", enrichedData);
      } catch (aiError) {
        console.warn("External AI Gateway failed; falling back to Lovable AI.", aiError);
      }
    }

    if (!enrichedData) {
      console.log(aiGatewayUrl ? "Using Lovable AI fallback" : "Using Lovable AI (no AI_GATEWAY_URL configured)");

      try {
        enrichedData = await enrichBuyerWithLovableAI({
          buyerName,
          buyerCountry,
          existingFields,
          hints,
        });
        console.log("Lovable AI enrichment:", enrichedData);
      } catch (aiError) {
        console.error("Lovable AI failed:", aiError);

        await supabase
          .from("ai_requests")
          .update({
            status: "failed",
            error_message: aiError instanceof Error ? aiError.message : "Unknown error",
          })
          .eq("id", aiRequestId);

        const errMsg = aiError instanceof Error ? aiError.message : "";
        if (errMsg === "RATE_LIMITED") {
          return new Response(
            JSON.stringify({
              error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
              requestId: aiRequestId,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (errMsg === "PAYMENT_REQUIRED") {
          return new Response(
            JSON.stringify({
              error: "AI 사용 한도를 초과했습니다. 관리자에게 문의해주세요.",
              requestId: aiRequestId,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            error: "AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
            requestId: aiRequestId,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Determine actual credits to charge based on AI response
    const creditsToCharge = enrichedData?.credits_to_charge ?? ENRICH_CREDIT_COST;
    let newBalance = creditData.balance;

    // Only deduct credits if AI found useful data
    if (creditsToCharge > 0) {
      const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: creditsToCharge,
        p_action_type: "AI_ENRICH",
        p_request_id: aiRequestId,
        p_meta: { buyer_id: buyerId, buyer_name: buyerName },
      });

      if (deductError || !deductResult?.[0]?.success) {
        console.error("Credit deduction failed:", deductError, deductResult);
        
        await supabase
          .from("ai_requests")
          .update({ status: "failed", error_message: "Credit deduction failed" })
          .eq("id", aiRequestId);

        return new Response(
          JSON.stringify({ error: "크레딧 차감에 실패했습니다.", requestId: aiRequestId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newBalance = deductResult[0].new_balance;
      console.log(`Credits deducted (${creditsToCharge}). New balance: ${newBalance}`);
    } else {
      console.log("No credits charged - AI did not find useful data");
    }

    // Update ai_requests with success
    await supabase
      .from("ai_requests")
      .update({
        status: enrichedData?.status === "no_data" ? "no_data" : "success",
        output_json: enrichedData,
        credit_cost: creditsToCharge,
      })
      .eq("id", aiRequestId);

    return new Response(
      JSON.stringify({
        success: true,
        enrichedData,
        newBalance,
        creditCost: creditsToCharge,
        requestId: aiRequestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Enrich buyer error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
