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

    const { message_id } = await req.json();
    if (!message_id) {
      return new Response(
        JSON.stringify({ error: "message_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nylas-get-message] User: ${user.id}, Message: ${message_id}`);

    // Get user's email account
    const { data: emailAccount, error: dbError } = await supabase
      .from("email_accounts")
      .select("grant_id")
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
    const grantUrl = `${NYLAS_API_BASE_URL}/v3/grants/${grantId}/messages/${message_id}`;
    const meUrl = `${NYLAS_API_BASE_URL}/v3/me/messages/${message_id}`;

    const requestInit: RequestInit = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${nylasApiKey}`,
        "Content-Type": "application/json",
      },
    };

    console.log(`[nylas-get-message] Calling Nylas: ${grantUrl}`);

    let nylasResponse = await fetch(grantUrl, requestInit);

    if (!nylasResponse.ok) {
      let errorText = await nylasResponse.text();
      const shouldRetryWithMe =
        nylasResponse.status === 401 &&
        errorText.includes("replace the user's grant_id in the path with /me/");

      if (shouldRetryWithMe) {
        console.log(`[nylas-get-message] Retrying Nylas with /me endpoint: ${meUrl}`);
        nylasResponse = await fetch(meUrl, requestInit);

        if (!nylasResponse.ok) {
          errorText = await nylasResponse.text();
          console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch message from Nylas", details: errorText }),
            { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch message from Nylas", details: errorText }),
          { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const nylasData = await nylasResponse.json();
    const msg = nylasData.data;

    console.log(`[nylas-get-message] Retrieved message: ${msg.subject}`);

    // Check if this message is already logged to CRM
    const { data: existingLog } = await supabase
      .from("sales_activity_logs")
      .select("id, buyer_id")
      .eq("nylas_message_id", message_id)
      .eq("created_by", user.id)
      .maybeSingle();

    // Normalize response
    const normalizedMessage = {
      id: msg.id,
      thread_id: msg.thread_id,
      subject: msg.subject || "(제목 없음)",
      from: msg.from?.[0] || { email: "", name: "" },
      to: msg.to || [],
      cc: msg.cc || [],
      bcc: msg.bcc || [],
      date: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
      body_html: msg.body || "",
      body_text: msg.body?.replace(/<[^>]*>/g, "") || "",
      snippet: msg.snippet || "",
      attachments: (msg.attachments || []).map((att: any) => ({
        id: att.id,
        filename: att.filename,
        content_type: att.content_type,
        size: att.size,
      })),
      folders: msg.folders || [],
      unread: msg.unread ?? false,
      starred: msg.starred ?? false,
      is_logged_to_crm: !!existingLog,
      crm_buyer_id: existingLog?.buyer_id || null,
    };

    return new Response(
      JSON.stringify(normalizedMessage),
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
