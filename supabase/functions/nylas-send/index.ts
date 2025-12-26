import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NYLAS_API_BASE_URL = "https://api.us.nylas.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const nylasApiKey = Deno.env.get("NYLAS_API_KEY");

    if (!nylasApiKey) {
      console.error("NYLAS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Nylas API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, cc, bcc, subject, body_html, buyer_id, reply_to_message_id } = await req.json();

    if (!to || !Array.isArray(to) || to.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one recipient is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nylas-send] User: ${user.id}, To: ${to.join(", ")}, Subject: ${subject}`);

    // Get user's email account
    const { data: emailAccount, error: dbError } = await supabase
      .from("email_accounts")
      .select("grant_id, email_address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError || !emailAccount) {
      console.error("No email account found:", dbError);
      return new Response(
        JSON.stringify({ error: "No email account connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const grantId = emailAccount.grant_id;

    // Build Nylas send request
    const nylasPayload: any = {
      subject: subject || "",
      body: body_html || "",
      to: to.map((email: string) => ({ email: email.trim() })),
    };

    if (cc && cc.length > 0) {
      nylasPayload.cc = cc.map((email: string) => ({ email: email.trim() }));
    }

    if (bcc && bcc.length > 0) {
      nylasPayload.bcc = bcc.map((email: string) => ({ email: email.trim() }));
    }

    if (reply_to_message_id) {
      nylasPayload.reply_to_message_id = reply_to_message_id;
    }

     const grantUrl = `${NYLAS_API_BASE_URL}/v3/grants/${grantId}/messages/send`;
     const meUrl = `${NYLAS_API_BASE_URL}/v3/me/messages/send`;
     console.log(`[nylas-send] Calling Nylas: ${grantUrl}`);

     const requestInit: RequestInit = {
       method: "POST",
       headers: {
         Authorization: `Bearer ${nylasApiKey}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify(nylasPayload),
     };

     let nylasResponse = await fetch(grantUrl, requestInit);

     if (!nylasResponse.ok) {
       let errorText = await nylasResponse.text();
       const shouldRetryWithMe =
         nylasResponse.status === 401 &&
         errorText.includes("replace the user's grant_id in the path with /me/");

       if (shouldRetryWithMe) {
         console.log(`[nylas-send] Retrying Nylas with /me endpoint: ${meUrl}`);
         nylasResponse = await fetch(meUrl, requestInit);

         if (!nylasResponse.ok) {
           errorText = await nylasResponse.text();
           console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
           return new Response(
             JSON.stringify({ error: "Failed to send email via Nylas", details: errorText }),
             { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
           );
         }
       } else {
         console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
         return new Response(
           JSON.stringify({ error: "Failed to send email via Nylas", details: errorText }),
           { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
     }

    const nylasData = await nylasResponse.json();
    const sentMessage = nylasData.data;

    console.log(`[nylas-send] Email sent successfully: ${sentMessage.id}`);

    // If buyer_id is provided, log to CRM automatically
    if (buyer_id) {
      // Get user's project
      const { data: projectData } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const projectId = projectData?.id || null;

      const { error: logError } = await supabase
        .from("sales_activity_logs")
        .insert({
          project_id: projectId,
          buyer_id: buyer_id,
          source: "email",
          direction: "outbound",
          title: subject || "(제목 없음)",
          content: body_html?.replace(/<[^>]*>/g, "").substring(0, 500) || "",
          from_email: emailAccount.email_address,
          to_emails: to,
          cc_emails: cc || [],
          bcc_emails: bcc || [],
          snippet: body_html?.replace(/<[^>]*>/g, "").substring(0, 100) || "",
          body_html: body_html,
          body_text: body_html?.replace(/<[^>]*>/g, "") || "",
          nylas_message_id: sentMessage.id,
          nylas_thread_id: sentMessage.thread_id,
          occurred_at: new Date().toISOString(),
          created_by: user.id,
        });

      if (logError) {
        console.error("Failed to log email to CRM:", logError);
      } else {
        console.log(`[nylas-send] Email logged to CRM for buyer: ${buyer_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: sentMessage.id,
        thread_id: sentMessage.thread_id,
        logged_to_crm: !!buyer_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
