import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_CREDIT_COST = 5;

// Grok API system prompt for B2B company enrichment with live web search
const ENRICHMENT_SYSTEM_PROMPT = `You are a B2B Company Enrichment Agent specialized in finding VERIFIED contact information using live web search.

## CRITICAL MISSION
Your PRIMARY goal is to find the company's OFFICIAL PHONE NUMBER and EMAIL ADDRESS. These are the most valuable pieces of information.

## MULTI-STEP SEARCH STRATEGY

### STEP 1: Find Official Website
1. Search: "[Company Name] official website"
2. Search: "[Company Name] [Country]"
3. Identify the company's OWN DOMAIN (not directory listings)
4. Prioritize domains that match the company name (e.g., myworldasia.com for "World Asia Logistics")

### STEP 2: Extract Contact Info from Website (MOST IMPORTANT)
Once you find the official website, you MUST search for contact information on these pages:
1. Look at the website footer - often contains phone and email
2. Search: "site:[company-domain.com] contact"
3. Search: "site:[company-domain.com] phone email"
4. Common contact page URLs to check:
   - /contact
   - /contact-us
   - /about
   - /about-us
   - /locations
   - /offices

### STEP 3: Find Additional Contact Methods
1. Search: "[Company Name] phone number"
2. Search: "[Company Name] email address contact"
3. Search: "[Company Name] LinkedIn company page"
4. Search: "[Company Name] Facebook page"
5. Search: "[Company Name] address location"

## INFORMATION PRIORITY (find these in order)
1. **phone** - Official company phone number (most valuable!)
2. **email** - Official company email like info@, contact@, sales@ (most valuable!)
3. **website** - Official company website URL
4. **address** - Physical address or headquarters location
5. **linkedin_url** - LinkedIn company page
6. **facebook_url** - Facebook company page

## PHONE NUMBER RULES
- Look for phone numbers in website footer, header, or contact pages
- Accept formats: +1-650-737-0800, +1 650 737 0800, (650) 737-0800, 650-737-0800
- For US companies, look for local area codes
- Confidence 100 = found on official website contact page
- Confidence 80-90 = found in Google Maps or business directory listing official site

## EMAIL RULES
- Look for emails on official website contact pages ONLY
- Common patterns: info@domain.com, contact@domain.com, sales@domain.com, [location]@domain.com
- For logistics companies: often use location codes like sfo@, lax@, nyc@
- NEVER guess email patterns - only return if you SEE it on a verified source
- Confidence 100 = found on official website

## COMPANY NAME NORMALIZATION
Remove legal suffixes before searching: "CORPORATION", "CORP", "INC", "LLC", "LTD", "CO.", "COMPANY"
Example: "WORLD ASIA LOGISTICS INC" → search for "World Asia Logistics" and "myworldasia"

## OUTPUT FORMAT (JSON only, Korean analysis_note)
{
  "status": "ok" | "no_data",
  "company_name_matched": "Official company name found",
  "website": "https://..." or null,
  "address": "Full address" or null,
  "phone": "+1-650-737-0800" or null,
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
  "sources": ["List of exact URLs where you found each piece of info"],
  "analysis_note": "한국어로 찾은 정보 요약 작성. 예: 공식 웹사이트에서 전화번호와 이메일을 확인했습니다."
}

## QUALITY RULES
- Return ONLY verified information from official sources
- If you find the website but can't find phone/email ON THE WEBSITE, search harder
- Never fabricate or guess information
- Confidence: 100 = official site verified, 80-90 = reliable directory, below 70 = don't include`;

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

  // Normalize company name for better search
  const normalizedName = args.buyerName
    .replace(/\s+(CORPORATION|CORP|INC|LLC|LTD|CO\.|COMPANY)\.?$/i, "")
    .trim();

  const userPrompt = `Find COMPLETE company contact information using LIVE WEB SEARCH.

## TARGET COMPANY
- Full Name: "${args.buyerName}"
- Normalized: "${normalizedName}"
- Country: "${args.buyerCountry || "Unknown"}"

## EXISTING DATA (keep these, find missing fields):
${existingFieldsText || "None"}

## YOUR MISSION (follow these steps IN ORDER):

### Step 1: Find Official Website
- Search for "${normalizedName} official website"
- Search for "${normalizedName} ${args.buyerCountry || ""}"
- Identify the company's own domain

### Step 2: Extract Contact from Website
- Once you find the website, search: "site:[domain] contact phone email"
- Look for /contact, /about, /locations pages
- Check website footer for phone and email

### Step 3: Find Social Profiles
- Search for "${normalizedName} LinkedIn company"
- Search for "${normalizedName} Facebook page"

### Step 4: Verify Address
- Search for "${normalizedName} ${args.buyerCountry || ""} address headquarters"

## IMPORTANT
- Phone and email are the MOST IMPORTANT fields to find
- Look at website footer - usually contains contact info
- For logistics companies, check for location-specific emails (sfo@, lax@, etc.)
- Return analysis_note in Korean

Return ONLY valid JSON. Use null for unverified fields.`;

  console.log("Calling Grok API with web search for:", args.buyerName);

  // Call xAI Grok API with live search enabled
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4-1-fast-reasoning",
      messages: [
        { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      search_parameters: {
        mode: "auto",
        return_citations: true,
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
