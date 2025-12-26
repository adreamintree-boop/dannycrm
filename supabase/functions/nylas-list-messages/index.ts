import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NYLAS_API_BASE_URL = "https://api.us.nylas.com";

// Retry with exponential backoff for rate limits
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
      console.log(`[nylas-list-messages] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded for rate limit');
}

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
    const nylasApiKey = Deno.env.get("TaaS_CRM_Email_Nylas_Test");

    if (!nylasApiKey) {
      console.error("TaaS_CRM_Email_Nylas_Test not configured");
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

    // Parse request body
    const { folder = "INBOX", page = 1, page_size = 20, search } = await req.json();

    console.log(`[nylas-list-messages] User: ${user.id}, Folder: ${folder}, Page: ${page}`);

    // Get user's email account
    const { data: emailAccount, error: dbError } = await supabase
      .from("email_accounts")
      .select("grant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError || !emailAccount) {
      console.error("No email account found:", dbError);
      return new Response(
        JSON.stringify({ error: "No email account connected", items: [], page, page_size }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const grantId = emailAccount.grant_id;
    const offset = (page - 1) * page_size;

    // Build Nylas API URL
    const params = new URLSearchParams({
      limit: page_size.toString(),
      offset: offset.toString(),
    });

    // Map folder names to Nylas folder queries
    const folderMap: Record<string, string> = {
      inbox: "INBOX",
      sent: "SENT",
      draft: "DRAFTS",
      trash: "TRASH",
      all: "",
    };

    const nylasFolder = folderMap[folder.toLowerCase()] || folder;
    if (nylasFolder) {
      params.append("in", nylasFolder);
    }

    if (search) {
      params.append("search_query_native", search);
    }

    const grantUrl = `${NYLAS_API_BASE_URL}/v3/grants/${grantId}/messages?${params.toString()}`;
    const meUrl = `${NYLAS_API_BASE_URL}/v3/grants/me/messages?${params.toString()}`;

    const requestInit: RequestInit = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${nylasApiKey}`,
        "Content-Type": "application/json",
      },
    };

    console.log(`[nylas-list-messages] Calling Nylas: ${grantUrl}`);

    let nylasResponse = await fetchWithRetry(grantUrl, requestInit);

    if (!nylasResponse.ok) {
      let errorText = await nylasResponse.text();
      
      // Handle invalid grant - the grant may have expired or been revoked
      if (nylasResponse.status === 404 && errorText.includes("grant.not_found")) {
        console.error(`[nylas-list-messages] Grant not found - grant may be expired or revoked`);
        
        // Update the email account status to disconnected
        await supabase
          .from("email_accounts")
          .update({ status: "disconnected" })
          .eq("user_id", user.id);
        
        return new Response(
          JSON.stringify({ 
            error: "Email account connection expired", 
            details: "Please reconnect your email account in settings.",
            reconnect_required: true,
            items: [], 
            page, 
            page_size 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const shouldRetryWithMe =
        nylasResponse.status === 401 &&
        errorText.includes("replace the user's grant_id in the path with /me/");

      if (shouldRetryWithMe) {
        console.log(`[nylas-list-messages] Retrying Nylas with /me endpoint: ${meUrl}`);
        nylasResponse = await fetchWithRetry(meUrl, requestInit);

        if (!nylasResponse.ok) {
          errorText = await nylasResponse.text();
          console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch messages from Nylas", details: errorText }),
            { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error(`Nylas API error: ${nylasResponse.status}`, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch messages from Nylas", details: errorText }),
          { status: nylasResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const nylasData = await nylasResponse.json();
    console.log(`[nylas-list-messages] Received ${nylasData.data?.length || 0} messages`);

    // Normalize Nylas response
    const items = (nylasData.data || []).map((msg: any) => ({
      id: msg.id,
      thread_id: msg.thread_id,
      folder: msg.folders?.[0] || folder,
      subject: msg.subject || "(제목 없음)",
      snippet: msg.snippet || "",
      from: msg.from?.[0] || { email: "", name: "" },
      to: msg.to || [],
      cc: msg.cc || [],
      bcc: msg.bcc || [],
      date: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
      has_attachments: (msg.attachments?.length || 0) > 0,
      unread: msg.unread ?? true,
      starred: msg.starred ?? false,
    }));

    return new Response(
      JSON.stringify({
        items,
        page,
        page_size,
        has_more: items.length === page_size,
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
