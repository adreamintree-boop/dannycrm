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

    // Get request body
    const body = await req.json();
    const { code, state, redirect_uri: redirectUri } = body;

    // Debug logging
    console.log('OAuth Callback - Received code:', code ? code.substring(0, 10) + '...' : 'MISSING');
    console.log('OAuth Callback - Received state:', state ? 'present' : 'MISSING');
    console.log('OAuth Callback - Received redirect_uri:', redirectUri || 'MISSING');

    if (!code) {
      return new Response(
        JSON.stringify({ ok: false, step: 'params', error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!redirectUri) {
      console.error('redirect_uri not provided in request body');
      return new Response(
        JSON.stringify({ ok: false, step: 'params', error: 'Missing redirect_uri parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate state
    if (!state) {
      return new Response(
        JSON.stringify({ ok: false, step: 'params', error: 'Missing state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        JSON.stringify({ ok: false, step: 'state', error: 'Invalid state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user_id matches
    if (stateData.user_id !== userId) {
      console.error('State user_id mismatch:', stateData.user_id, 'vs', userId);
      return new Response(
        JSON.stringify({ ok: false, step: 'state', error: 'State validation failed - user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check timestamp (expire after 10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error('State expired, age:', stateAge, 'ms');
      return new Response(
        JSON.stringify({ ok: false, step: 'state', error: 'State expired - please try again' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Nylas credentials
    const clientId = Deno.env.get('NYLAS_CLIENT_ID');
    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    const nylasApiBase = Deno.env.get('NYLAS_API_BASE') || 'https://api.us.nylas.com';

    // Debug logging (safe)
    console.log('OAuth Callback - Using client_id:', clientId ? clientId.substring(0, 6) + '...' : 'NOT SET');
    console.log('OAuth Callback - Using Nylas base URL:', nylasApiBase);
    console.log('OAuth Callback - Using redirect_uri:', redirectUri);

    if (!clientId || !clientSecret) {
      console.error('Nylas credentials not configured');
      return new Response(
        JSON.stringify({ ok: false, step: 'config', error: 'Nylas credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Basic auth credentials
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    
    // Exchange code for token with Nylas
    const tokenUrl = `${nylasApiBase}/v3/connect/token`;
    console.log('OAuth Callback - Token exchange URL:', tokenUrl);
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const responseText = await tokenResponse.text();
    console.log('OAuth Callback - Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Nylas token exchange failed:', tokenResponse.status, responseText);
      
      // Parse error for better debugging
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails = errorJson.error_description || errorJson.error || responseText;
      } catch {
        // Keep raw response
      }
      
      return new Response(
        JSON.stringify({ 
          ok: false,
          step: 'token_exchange',
          error: 'Failed to exchange authorization code',
          nylas_status: tokenResponse.status,
          nylas_error: errorDetails,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = JSON.parse(responseText);
    console.log('OAuth Callback - Token exchange successful');

    // Extract grant_id and email from response
    const grantId = tokenData.grant_id;
    const email = tokenData.email || tokenData.email_address;
    const provider = tokenData.provider || 'google';

    if (!grantId) {
      console.error('No grant_id in response:', tokenData);
      return new Response(
        JSON.stringify({ ok: false, step: 'token_response', error: 'No grant ID received from Nylas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OAuth Callback - Grant ID received, storing in database');

    // Store the grant in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // First delete any existing record for this user
    await supabaseClient
      .from('email_accounts')
      .delete()
      .eq('user_id', userId);

    // Insert new record
    const { error: insertError } = await supabaseClient
      .from('email_accounts')
      .insert({
        user_id: userId,
        grant_id: grantId,
        email_address: email || 'unknown@email.com',
        provider: provider,
        status: 'connected',
      });

    if (insertError) {
      console.error('Error storing grant:', insertError);
      return new Response(
        JSON.stringify({ ok: false, step: 'db_insert', error: 'Failed to store email connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OAuth Callback - Email account stored successfully');

    return new Response(
      JSON.stringify({ 
        ok: true,
        success: true,
        email: email,
        provider: provider,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({ ok: false, step: 'exception', error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
