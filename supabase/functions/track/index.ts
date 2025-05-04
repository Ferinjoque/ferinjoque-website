// functions/track/index.ts
import { serve } from 'https://deno.land/x/sift@0.5.0/mod.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ✳️ Read ENV at load time
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 1️⃣ If either is missing, crash immediately (no top-level `return`)
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing required SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// 2️⃣ Init Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3️⃣ Whitelist your GitHub Pages origin
const ALLOWED_ORIGINS = new Set([
  'https://ferinjoque.github.io',
  'https://injoque.dev'
]);

serve(async (req) => {
  const origin = req.headers.get('origin') || '';

  // — OPTIONS preflight —
  if (req.method === 'OPTIONS') {
    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // — Only POST allowed from here —
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'Allow': 'POST, OPTIONS' }
    });
  }

  // — CORS on actual POST —
  if (!ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  const corsHeaders = { 'Access-Control-Allow-Origin': origin };

  // — Parse JSON body —
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    });
  }

  const { event_type, event_data } = payload;
  if (!event_type) {
    return new Response(JSON.stringify({ error: 'Missing event_type' }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  // — Capture IP / UA / session —
  const ip = req.headers.get('x-forwarded-for')
          || req.headers.get('x-real-ip')
          || (req.conn?.remoteAddr as any)?.hostname
          || 'unknown';
  const ua        = req.headers.get('user-agent') || 'unknown';
  const sessionId = req.headers.get('x-session-id')    || 'none';

  // — Insert into Supabase—
  const { error: dbError } = await supabase
    .from('events')
    .insert({
      ip_address: ip,
      user_agent: ua,
      session_id: sessionId,
      event_type,
      event_data
    });

  if (dbError) {
    console.error('Supabase insert error:', dbError);
    return new Response(JSON.stringify({ error: dbError.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  // — Done! —
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});
