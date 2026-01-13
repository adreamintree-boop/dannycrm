import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getJwtFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

function getUserIdFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const jwt = getJwtFromAuthHeader(authHeader);
    
    if (!jwt) {
      return new Response(
        JSON.stringify({ ok: false, step: 'auth', error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = getUserIdFromJwt(jwt);
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, step: 'auth', error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Nylas credentials from environment
    const clientId = Deno.env.get('NYLAS_CLIENT_ID');
    const nylasApiBase = Deno.env.get('NYLAS_API_BASE') || 'https://api.us.nylas.com';
    
    // Debug logging (safe - only first 6 chars of client_id)
    console.log('OAuth Start - Using client_id:', clientId ? clientId.substring(0, 6) + '...' : 'NOT SET');
    console.log('OAuth Start - Using Nylas base URL:', nylasApiBase);
    
    if (!clientId) {
      console.error('NYLAS_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ ok: false, step: 'config', error: 'Nylas client ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to get redirect URI - MUST be provided by client
    const body = await req.json().catch(() => ({}));
    const redirectUri = body.redirect_uri;
    
    if (!redirectUri) {
      console.error('redirect_uri not provided in request body');
      return new Response(
        JSON.stringify({ ok: false, step: 'params', error: 'redirect_uri is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OAuth Start - Using redirect_uri:', redirectUri);

    // Generate a secure state value with user_id and nonce
    const nonce = crypto.randomUUID();
    const stateData = {
      user_id: userId,
      nonce: nonce,
      timestamp: Date.now(),
      redirect_uri: redirectUri, // Store the redirect_uri in state for validation
    };
    
    // Encode state as base64
    const state = btoa(JSON.stringify(stateData));

    // Store state in database for validation during callback
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Store the state in a temporary table or use email_accounts
    // We'll use a simple approach: store the nonce with user_id
    const { error: storeError } = await supabaseClient
      .from('email_accounts')
      .upsert({
        user_id: userId,
        grant_id: `pending_${nonce}`, // Temporary placeholder
        email_address: 'pending@oauth.flow',
        provider: 'oauth_pending',
        status: 'pending',
      }, { onConflict: 'user_id' });

    if (storeError) {
      console.error('Error storing OAuth state:', storeError);
    }

    // Build Nylas OAuth URL using configured base URL
    const nylasAuthUrl = new URL(`${nylasApiBase}/v3/connect/auth`);
    nylasAuthUrl.searchParams.set('client_id', clientId);
    nylasAuthUrl.searchParams.set('redirect_uri', redirectUri);
    nylasAuthUrl.searchParams.set('response_type', 'code');
    nylasAuthUrl.searchParams.set('state', state);
    nylasAuthUrl.searchParams.set('access_type', 'offline');
    // Request necessary scopes
    nylasAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send');

    console.log('OAuth Start - Auth URL generated successfully');

    return new Response(
      JSON.stringify({ 
        ok: true,
        auth_url: nylasAuthUrl.toString(),
        state: state,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('OAuth start error:', error);
    return new Response(
      JSON.stringify({ ok: false, step: 'exception', error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
