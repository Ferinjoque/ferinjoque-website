// functions/track/index.ts
import { serve } from 'https://deno.land/x/sift@0.5.0/mod.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1️⃣ Read from the Function’s ENV (set these under "Settings → Edge Function → Secrets")
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('⚠️ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return new Response(JSON.stringify({ error: 'Configuration error.' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 2️⃣ Init your Supabase client with service-role privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3️⃣ Define a strict CORS whitelist (YOUR Pages URL here!)
const ALLOWED_ORIGINS = new Set([
  'https://ferinjoque.github.io',
  'https://injoque.dev'
]);

serve(async (req) => {
  const origin = req.headers.get('origin') || '';

  // 4️⃣ Pre-flight handling
  if (req.method === 'OPTIONS') {
    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response('ok', {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 5️⃣ All other routes must be POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'Allow': 'POST, OPTIONS' }
    });
  }

  // 6️⃣ Enforce CORS on the actual POST too
  if (!ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  const corsHeaders = { 'Access-Control-Allow-Origin': origin };

  // 7️⃣ Parse JSON
  let payload: { event_type?: string, event_data?: any };
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

  // 8️⃣ Capture IP, UA, session
  const ip = req.headers.get('x-forwarded-for')
          || req.headers.get('x-real-ip')
          || (req.conn?.remoteAddr as any)?.hostname
          || 'unknown';
  const ua        = req.headers.get('user-agent') || 'unknown';
  const sessionId = req.headers.get('x-session-id')    || 'none';

  // 9️⃣ Insert into your `events` table
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

  // 🔟 All good!
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});
