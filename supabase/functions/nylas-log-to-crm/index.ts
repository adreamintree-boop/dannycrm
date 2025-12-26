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

    const { message_id, buyer_id } = await req.json();

    if (!message_id || !buyer_id) {
      return new Response(
        JSON.stringify({ error: "message_id and buyer_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nylas-log-to-crm] User: ${user.id}, Message: ${message_id}, Buyer: ${buyer_id}`);

    // Check if already logged
    const { data: existingLog } = await supabase
      .from("sales_activity_logs")
      .select("id")
      .eq("nylas_message_id", message_id)
      .eq("created_by", user.id)
      .maybeSingle();

    if (existingLog) {
      console.log(`[nylas-log-to-crm] Message already logged: ${existingLog.id}`);
      return new Response(
        JSON.stringify({ logged: true, sales_activity_id: existingLog.id, already_existed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Verify buyer belongs to user
    const { data: buyer, error: buyerError } = await supabase
      .from("crm_buyers")
      .select("id, company_name")
      .eq("id", buyer_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (buyerError || !buyer) {
      console.error("Buyer not found or not owned by user:", buyerError);
      return new Response(
        JSON.stringify({ error: "Buyer not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full message from Nylas
    const grantId = emailAccount.grant_id;
    const nylasUrl = `${NYLAS_API_BASE_URL}/v3/grants/${grantId}/messages/${message_id}`;
    console.log(`[nylas-log-to-crm] Fetching message from Nylas: ${nylasUrl}`);

    const nylasResponse = await fetch(nylasUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${nylasApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!nylasResponse.ok) {
      const errorText = await nylasResponse.text();
      console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch message from Nylas", details: errorText }),
        { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nylasData = await nylasResponse.json();
    const msg = nylasData.data;

    // Determine direction based on folders
    const folders = msg.folders || [];
    const isInbox = folders.some((f: string) => f.toLowerCase().includes("inbox"));
    const isSent = folders.some((f: string) => f.toLowerCase().includes("sent"));
    const direction = isInbox ? "inbound" : isSent ? "outbound" : "inbound";

    // Get user's project
    const { data: projectData } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const projectId = projectData?.id || null;

    // Extract email addresses
    const fromEmail = msg.from?.[0]?.email || "";
    const toEmails = (msg.to || []).map((t: any) => t.email);
    const ccEmails = (msg.cc || []).map((t: any) => t.email);
    const bccEmails = (msg.bcc || []).map((t: any) => t.email);
    const bodyText = msg.body?.replace(/<[^>]*>/g, "") || "";

    // Insert activity log
    const { data: insertedLog, error: insertError } = await supabase
      .from("sales_activity_logs")
      .insert({
        project_id: projectId,
        buyer_id: buyer_id,
        source: "email",
        direction: direction,
        title: msg.subject || "(제목 없음)",
        content: bodyText.substring(0, 500),
        from_email: fromEmail,
        to_emails: toEmails,
        cc_emails: ccEmails,
        bcc_emails: bccEmails,
        snippet: msg.snippet || bodyText.substring(0, 100),
        body_html: msg.body || "",
        body_text: bodyText,
        nylas_message_id: message_id,
        nylas_thread_id: msg.thread_id,
        occurred_at: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert activity log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log to CRM", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nylas-log-to-crm] Successfully logged: ${insertedLog.id}`);

    return new Response(
      JSON.stringify({
        logged: true,
        sales_activity_id: insertedLog.id,
        buyer_name: buyer.company_name,
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
