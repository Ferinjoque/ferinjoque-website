// supabase/functions/track/index.ts - Using Deno.serve

console.log("DEBUG: index.ts starting (using Deno.serve)...");

// Only import supabase client now
import { createClient } from "supabase";

console.log("DEBUG: Imports successful.");

// Read ENV vars
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("FATAL ERROR: Missing Supabase ENV Vars!");
  throw new Error('Missing required SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
console.log("DEBUG: ENV vars loaded.");

// Init Supabase client
let supabase;
try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("DEBUG: Supabase client initialized.");
} catch (e) {
    console.error("FATAL ERROR: Failed to initialize Supabase client:", e);
    throw e;
}

// Allowed Origins
const ALLOWED_ORIGINS = new Set([
  'https://ferinjoque.github.io',
  'https://injoque.dev'
]);

console.log("DEBUG: Starting Deno server...");

// Use Deno.serve directly
Deno.serve(async (req: Request) => {
  const url = new URL(req.url); // Get URL details
  const origin = req.headers.get("origin") || "";
  console.log(`DEBUG: Request received: ${req.method} ${url.pathname} from origin: ${origin}`); // Log inside handler

  // --- CORS Preflight Handling ---
  if (req.method === "OPTIONS") {
    console.log("DEBUG: Handling OPTIONS request.");
    const isAllowed = ALLOWED_ORIGINS.has(origin);
    if (isAllowed) {
      console.log("DEBUG: OPTIONS preflight allowed. Sending 204.");
      return new Response(null, { // Use 204 No Content
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-session-id", // Match request
          "Access-Control-Max-Age": "86400",
        },
      });
    } else {
      console.log("DEBUG: OPTIONS origin forbidden.");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // --- Handle POST Request ---
  if (req.method === "POST") {
    console.log("DEBUG: Handling POST request.");
    // Check origin
    if (!ALLOWED_ORIGINS.has(origin)) {
      console.log("DEBUG: POST origin forbidden.");
      return new Response("Forbidden", { status: 403 });
    }
    const corsHeaders = { "Access-Control-Allow-Origin": origin };
    console.log("DEBUG: POST origin allowed.");

    // --- Parse JSON body ---
    let payload: any;
    try {
      payload = await req.json();
      console.log("DEBUG: POST body parsed:", payload);
    } catch (e) {
      console.error("ERROR: Failed to parse POST JSON body:", e);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Validate Payload ---
    const { event_type, event_data } = payload;
    if (!event_type) {
      console.error("ERROR: Missing event_type in POST body.");
      return new Response(JSON.stringify({ error: 'Missing event_type' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    console.log(`DEBUG: Processing event_type: ${event_type}`);

    // --- Capture IP / UA / session ---
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || (req.conn?.remoteAddr as any)?.hostname || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';
    const sessionId = req.headers.get('x-session-id') || 'none';
    console.log(`DEBUG: Captured ip: ${ip}, ua: ${ua.substring(0,20)}..., session: ${sessionId}`);

    // --- Insert into Supabase ---
    console.log("DEBUG: Attempting Supabase insert...");
    const { error: dbError } = await supabase
      .from('events')
      .insert({
      // Corrected keys to match SQL table columns:
      event_type: event_type, // Matches 'event_type' column
      payload:    event_data, // Changed 'event_data' key to 'payload'
      ip:         ip,         // Changed 'ip_address' key to 'ip'
      session_id: sessionId, // Matches 'session_id' column
      user_agent: ua,
    });

    if (dbError) {
      console.error('ERROR: Supabase insert error:', dbError);
      return new Response(JSON.stringify({ error: "Database insert failed", details: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    console.log("DEBUG: Supabase insert successful.");

    // --- Success Response ---
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } // End POST handler

  // --- Default Response (Method Not Allowed) ---
  console.log(`DEBUG: Method ${req.method} not handled. Returning 405.`);
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST, OPTIONS" },
  });

}); // End Deno.serve

console.log("DEBUG: Deno server setup complete. Listening for requests..."); // Log after calling serve
