import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_CREDIT_COST = 5;

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
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL");
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

    // Determine which AI endpoint to use
    let enrichedData;

    if (aiGatewayUrl) {
      // Use external AI Gateway
      console.log("Calling external AI Gateway:", `${aiGatewayUrl}/buyer-enrich`);
      
      try {
        const aiResponse = await fetch(`${aiGatewayUrl}/buyer-enrich`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Add model parameter for external gateway
            buyerId,
            buyerName,
            buyerCountry,
            existingFields,
            hints,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("External AI Gateway error:", aiResponse.status, errorText);
          throw new Error(`AI Gateway returned ${aiResponse.status}`);
        }

        enrichedData = await aiResponse.json();
        console.log("External AI Gateway response:", enrichedData);
      } catch (aiError) {
        console.error("External AI Gateway failed:", aiError);
        
        await supabase
          .from("ai_requests")
          .update({
            status: "failed",
            error_message: aiError instanceof Error ? aiError.message : "Unknown error",
          })
          .eq("id", aiRequestId);

        return new Response(
          JSON.stringify({ 
            error: "AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
            requestId: aiRequestId
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Fallback to Lovable AI
      console.log("Using Lovable AI (no AI_GATEWAY_URL configured)");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (!LOVABLE_API_KEY) {
        await supabase
          .from("ai_requests")
          .update({ status: "failed", error_message: "No AI service configured" })
          .eq("id", aiRequestId);

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

Company Name: ${buyerName}
Country: ${buyerCountry || "Unknown"}
${existingFields?.website ? `Known Website: ${existingFields.website}` : ""}
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
                      notes: { type: "string", description: "Brief reasoning about findings" },
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
          console.error("Lovable AI error:", aiResponse.status);
          throw new Error("AI API error");
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

        if (!toolCall || toolCall.function.name !== "enrich_company") {
          throw new Error("No valid tool call received");
        }

        enrichedData = JSON.parse(toolCall.function.arguments);
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

        return new Response(
          JSON.stringify({ 
            error: "AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
            requestId: aiRequestId
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // AI succeeded - now deduct credits
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: ENRICH_CREDIT_COST,
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

    const newBalance = deductResult[0].new_balance;
    console.log(`Credits deducted. New balance: ${newBalance}`);

    // Update ai_requests with success
    await supabase
      .from("ai_requests")
      .update({
        status: "success",
        output_json: enrichedData,
      })
      .eq("id", aiRequestId);

    return new Response(
      JSON.stringify({
        success: true,
        enrichedData,
        newBalance,
        creditCost: ENRICH_CREDIT_COST,
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
