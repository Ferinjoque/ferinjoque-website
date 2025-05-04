import { serve } from 'https://deno.land/x/sift@0.5.0/mod.ts';
import { createClient } from
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPA_URL, SUPA_KEY);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // get payload
  const { event_type, event_data } = await req.json().catch(() => ({}));
  if (!event_type) {
    return new Response('Missing event_type', { status: 400 });
  }

  // capture IP & UA
  const ip = req.headers.get('x-forwarded-for')
      || req.headers.get('x-real-ip')
      || req.conn.remoteAddr.hostname;
  const ua = req.headers.get('user-agent');

  // insert into Supabase
  const { error } = await supabase
      .from('events')
      .insert({ ip_address: ip, user_agent: ua, event_type, event_data });

  if (error) {
    console.error('Insert error:', error);
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
