import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_CREDIT_COST = 5;

// Grok API system prompt for B2B company enrichment with live web search
const ENRICHMENT_SYSTEM_PROMPT = `You are a B2B Company Enrichment Agent. Your task is to find accurate company information using live web search.

CRITICAL INSTRUCTIONS:
1. USE LIVE WEB SEARCH to find the most up-to-date information about the company.
2. Search for the company's official website, contact information, and social media profiles.

SEARCH STRATEGY:
1. Company Name Normalization:
   - Remove legal suffixes: "CORPORATION", "CORP", "INC", "LLC", "LTD", "CO.", "COMPANY"
   - Example: "BINEX LINE CORPORATION" → search for "BINEX LINE" and "BINEX"

2. Search Queries to Try:
   - "[Company Name] official website"
   - "[Company Name] [Country] contact"
   - "[Company Name] LinkedIn"
   - "[Company Name] Facebook page"
   - "[Company Name] Google Maps address"

3. Information to Find:
   - website: Official company website URL (must be verified as official)
   - address: Physical address from Google Maps or official website
   - phone: Company phone number from official sources
   - email: Company email (only from official website contact page, never guess)
   - facebook_url: Official Facebook page URL
   - linkedin_url: Official LinkedIn company page URL

4. Quality Rules:
   - Only return information you can verify through web search
   - Never fabricate or guess information
   - If you can't find verified information, return null for that field
   - Confidence scores: 100 = verified on official site, 70-90 = multiple reliable sources, below 70 = uncertain

OUTPUT FORMAT (JSON only):
{
  "status": "ok" | "no_data",
  "company_name_matched": "Official company name found",
  "website": "https://..." or null,
  "address": "Full address" or null,
  "phone": "+1-xxx-xxx-xxxx" or null,
  "email": "contact@..." or null,
  "facebook_url": "https://facebook.com/..." or null,
  "linkedin_url": "https://linkedin.com/company/..." or null,
  "confidence": {
    "website": 0-100,
    "address": 0-100,
    "phone": 0-100,
    "email": 0-100,
    "facebook_url": 0-100,
    "linkedin_url": 0-100
  },
  "sources": ["List of URLs/sources used"],
  "analysis_note": "Brief summary of what was found"
}`;

interface GrokEnrichmentResult {
  status: "ok" | "no_data";
  company_name_matched?: string;
  website?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  confidence?: {
    website?: number;
    address?: number;
    phone?: number;
    email?: number;
    facebook_url?: number;
    linkedin_url?: number;
  };
  sources?: string[];
  analysis_note?: string;
}

async function enrichBuyerWithGrok(args: {
  buyerName: string;
  buyerCountry?: string;
  existingFields?: Record<string, unknown>;
}): Promise<GrokEnrichmentResult> {
  const GROK_API_KEY = Deno.env.get("TaaS_CRM_Data_Enrichment_Test_Grok");

  if (!GROK_API_KEY) {
    throw new Error("Grok API key is not configured");
  }

  const existing = args.existingFields || {};
  const existingFieldsText = Object.entries(existing)
    .filter(([_, v]) => v && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const userPrompt = `Find company information for B2B enrichment using LIVE WEB SEARCH.

COMPANY TO SEARCH:
- Company Name: "${args.buyerName}"
- Country Hint: "${args.buyerCountry || "Unknown"}"

EXISTING INFORMATION (do not change these, find missing fields only):
${existingFieldsText || "None"}

REQUIRED ACTIONS:
1. Search the web for this company's official website
2. Find their Google Maps listing for address
3. Look for official contact information (phone, email)
4. Find their Facebook and LinkedIn company pages

Return ONLY valid JSON matching the specified format. Use null for any field you cannot verify.`;

  console.log("Calling Grok API with web search for:", args.buyerName);

  // Call xAI Grok API with live search enabled
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-latest",
      messages: [
        { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      search_parameters: {
        mode: "auto",
        return_citations: true,
        from_date: "",
        to_date: "",
        max_search_results: 10,
      },
      temperature: 0.1,
      max_tokens: 2000,
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
    const result = JSON.parse(jsonContent) as GrokEnrichmentResult;
    console.log("Parsed Grok enrichment result:", JSON.stringify(result, null, 2));
    return result;
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

    const { buyerId, buyerName, buyerCountry, existingFields } = await req.json();

    if (!buyerId || !buyerName) {
      return new Response(
        JSON.stringify({ error: "buyerId and buyerName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Enriching buyer with Grok: ${buyerName} (${buyerId}) for user: ${user.id}`);

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
    const inputJson = { buyerId, buyerName, buyerCountry, existingFields };
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

    // Call Grok API for enrichment
    let enrichedData: GrokEnrichmentResult;
    
    try {
      enrichedData = await enrichBuyerWithGrok({
        buyerName,
        buyerCountry,
        existingFields,
      });
      console.log("Grok enrichment result:", enrichedData);
    } catch (aiError) {
      console.error("Grok API failed:", aiError);

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
            error: "AI API 한도를 초과했습니다. 관리자에게 문의해주세요.",
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

    // Determine if we should charge credits (only if useful data found)
    const hasUsefulData = enrichedData.status === "ok" && 
      (enrichedData.website || enrichedData.address || enrichedData.phone || 
       enrichedData.email || enrichedData.facebook_url || enrichedData.linkedin_url);
    
    const creditsToCharge = hasUsefulData ? ENRICH_CREDIT_COST : 0;
    let newBalance = creditData.balance;

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
      console.log("No credits charged - no useful data found");
    }

    // Update ai_requests with success
    await supabase
      .from("ai_requests")
      .update({
        status: enrichedData.status === "no_data" ? "no_data" : "success",
        output_json: enrichedData,
        credit_cost: creditsToCharge,
      })
      .eq("id", aiRequestId);

    // Transform to frontend expected format
    const frontendEnrichedData = {
      country: buyerCountry || null,
      address: enrichedData.address || null,
      website: enrichedData.website || null,
      phone: enrichedData.phone || null,
      email: enrichedData.email || null,
      facebook_url: enrichedData.facebook_url || null,
      linkedin_url: enrichedData.linkedin_url || null,
      youtube_url: null,
      notes: enrichedData.analysis_note || null,
      confidence: enrichedData.confidence || {},
    };

    return new Response(
      JSON.stringify({
        success: true,
        enrichedData: frontendEnrichedData,
        newBalance,
        creditCost: creditsToCharge,
        requestId: aiRequestId,
        sources: enrichedData.sources,
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
