import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      request_id, 
      search_key, 
      row_fingerprints, 
      page_number, 
      search_meta 
    } = await req.json();

    if (!request_id || !search_key || !Array.isArray(row_fingerprints) || typeof page_number !== 'number') {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: request_id, search_key, row_fingerprints, page_number' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no rows to charge, just return success
    if (row_fingerprints.length === 0) {
      const { data: balanceData } = await supabase.rpc('get_credit_balance', { p_user_id: user.id });
      return new Response(JSON.stringify({ 
        success: true, 
        new_balance: balanceData || 0,
        charged_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call atomic charge_bl_search_page function
    const { data, error } = await supabase.rpc('charge_bl_search_page', {
      p_user_id: user.id,
      p_search_key: search_key,
      p_row_fingerprints: row_fingerprints,
      p_page_number: page_number,
      p_request_id: request_id,
      p_meta: search_meta || {}
    });

    if (error) {
      console.error('Charge credits error:', error);
      return new Response(JSON.stringify({ error: 'Failed to process credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = data?.[0];
    
    if (!result?.success) {
      console.log('Insufficient credits:', result);
      return new Response(JSON.stringify({ 
        error: result?.error_message || '크레딧이 부족합니다.',
        balance: result?.new_balance || 0,
        required: result?.charged_count || row_fingerprints.length
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Credits charged for user ${user.id}: page ${page_number}, charged ${result.charged_count} rows, new balance: ${result.new_balance}`);

    return new Response(JSON.stringify({ 
      success: true, 
      new_balance: result.new_balance,
      charged_count: result.charged_count
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('BL Search credit error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
