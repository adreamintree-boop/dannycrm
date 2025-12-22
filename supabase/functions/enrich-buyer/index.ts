import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_CREDIT_COST = 5;

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { buyer_id, company_name, country, hints } = await req.json();

    if (!buyer_id || !company_name) {
      return new Response(
        JSON.stringify({ error: "buyer_id and company_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Enriching buyer: ${company_name} (${buyer_id}) for user: ${user.id}`);

    // Check if user has enough credits
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
          error: `잔여 크레딧이 부족합니다 (필요: ${ENRICH_CREDIT_COST}, 보유: ${creditData.balance})`,
          insufficient_credits: true,
          balance: creditData.balance
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits first (will refund if AI fails)
    const requestId = crypto.randomUUID();
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: ENRICH_CREDIT_COST,
      p_action_type: "AI_ENRICH",
      p_request_id: requestId,
      p_meta: { buyer_id, company_name, country },
    });

    if (deductError || !deductResult?.[0]?.success) {
      const errorMsg = deductResult?.[0]?.error_message || "크레딧 차감 중 오류가 발생했습니다.";
      console.error("Deduct credits error:", deductError, deductResult);
      return new Response(
        JSON.stringify({ error: errorMsg, balance: deductResult?.[0]?.new_balance }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newBalance = deductResult[0].new_balance;
    console.log(`Credits deducted. New balance: ${newBalance}`);

    // Call AI for enrichment
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Refund credits
      await refundCredits(supabase, user.id, ENRICH_CREDIT_COST, requestId);
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a business intelligence assistant that finds publicly available company information.
Given a company name and country, search your knowledge for:
- Company address
- Official website
- Phone number
- Email address
- Social media URLs (Facebook, LinkedIn, YouTube)

IMPORTANT:
- Only return information you are confident about
- Set confidence scores (0-1) for each field
- If you cannot find reliable information, return empty strings and low confidence
- Always use the tool to return structured data`;

    const userPrompt = `Find public information about this company:

Company Name: ${company_name}
Country: ${country || "Unknown"}
${hints?.website ? `Known Website: ${hints.website}` : ""}
${hints?.hs_code ? `Product HS Code: ${hints.hs_code}` : ""}
${hints?.product_desc ? `Product Description: ${hints.product_desc}` : ""}

Use the enrich_company tool to return the information you find.`;

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "enrich_company",
                description: "Return structured company information",
                parameters: {
                  type: "object",
                  properties: {
                    country: { type: "string", description: "Full country name" },
                    address: { type: "string", description: "Full street address" },
                    website: { type: "string", description: "Official website URL" },
                    phone: { type: "string", description: "Phone number with country code" },
                    email: { type: "string", description: "General or sales email" },
                    facebook_url: { type: "string", description: "Facebook page URL" },
                    linkedin_url: { type: "string", description: "LinkedIn company page URL" },
                    youtube_url: { type: "string", description: "YouTube channel URL" },
                    notes: { type: "string", description: "Brief reasoning about findings and data quality" },
                    confidence: {
                      type: "object",
                      properties: {
                        address: { type: "number", description: "Confidence 0-1" },
                        website: { type: "number", description: "Confidence 0-1" },
                        phone: { type: "number", description: "Confidence 0-1" },
                        email: { type: "number", description: "Confidence 0-1" },
                      },
                      required: ["address", "website", "phone", "email"],
                    },
                  },
                  required: ["notes", "confidence"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "enrich_company" } },
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI API error:", aiResponse.status, await aiResponse.text());
        await refundCredits(supabase, user.id, ENRICH_CREDIT_COST, requestId);
        return new Response(
          JSON.stringify({ error: "AI 서비스 오류가 발생했습니다. 크레딧이 환불됩니다.", refunded: true }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall || toolCall.function.name !== "enrich_company") {
        console.error("No tool call received:", JSON.stringify(aiData));
        await refundCredits(supabase, user.id, ENRICH_CREDIT_COST, requestId);
        return new Response(
          JSON.stringify({ error: "AI 응답이 없습니다. 크레딧이 환불됩니다.", refunded: true }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse tool call arguments
      let enrichedData;
      try {
        enrichedData = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
        await refundCredits(supabase, user.id, ENRICH_CREDIT_COST, requestId);
        return new Response(
          JSON.stringify({ error: "AI 응답 파싱 오류. 크레딧이 환불됩니다.", refunded: true }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("AI enrichment successful:", enrichedData);

      return new Response(
        JSON.stringify({
          success: true,
          enriched_data: enrichedData,
          new_balance: newBalance,
          credits_charged: ENRICH_CREDIT_COST,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("AI call error:", aiError);
      await refundCredits(supabase, user.id, ENRICH_CREDIT_COST, requestId);
      return new Response(
        JSON.stringify({ error: "AI 호출 중 오류가 발생했습니다. 크레딧이 환불됩니다.", refunded: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Enrich buyer error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refundCredits(supabase: any, userId: string, amount: number, originalRequestId: string) {
  try {
    // Get current balance first
    const { data: current, error: fetchError } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (fetchError || !current) {
      console.error("Failed to fetch current balance for refund:", fetchError);
      return;
    }

    // Update with new balance
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({ balance: current.balance + amount })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update balance for refund:", updateError);
      return;
    }

    // Log the refund
    await supabase.from("credit_ledger").insert({
      user_id: userId,
      action_type: "AI_ENRICH",
      amount: amount, // positive = refund
      request_id: crypto.randomUUID(),
      meta: { refund: true, original_request_id: originalRequestId, reason: "ai_failure" },
    });

    console.log(`Refunded ${amount} credits to user ${userId}`);
  } catch (refundError) {
    console.error("Failed to refund credits:", refundError);
  }
}
