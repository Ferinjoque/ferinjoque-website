// supabase/functions/track/index.ts - RESTORED + DEBUG LOGS
console.log("DEBUG: index.ts starting..."); // Log start

import { serve } from "sift";
import { createClient } from "supabase";

console.log("DEBUG: Imports successful."); // Log after imports

// ✳️ Read ENV at load time
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 1️⃣ If either is missing, crash immediately
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("FATAL ERROR: Missing Supabase ENV Vars!"); // Log fatal error
  throw new Error('Missing required SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
console.log("DEBUG: ENV vars loaded."); // Log ENV var success

// 2️⃣ Init Supabase client
let supabase;
try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("DEBUG: Supabase client initialized."); // Log client init success
} catch (e) {
    console.error("FATAL ERROR: Failed to initialize Supabase client:", e); // Log client init failure
    throw e; // Re-throw to halt execution
}


// 3️⃣ Whitelist your GitHub Pages origin
const ALLOWED_ORIGINS = new Set([
  'https://ferinjoque.github.io',
  'https://injoque.dev'
]);

console.log("DEBUG: Starting server with explicit root route..."); // Log before serve

serve({
    "/": async (req) => { // Explicitly handle the root path
        console.log(`DEBUG: Request received: ${req.method} ${req.url}`); // Log each request
        const origin = req.headers.get('origin') || '';

        // --- OPTIONS preflight ---
        if (req.method === 'OPTIONS') {
            console.log(`DEBUG: Handling OPTIONS from origin: ${origin}`);
            // ... (rest of your OPTIONS logic) ...
             if (!ALLOWED_ORIGINS.has(origin)) {
                console.log("DEBUG: OPTIONS origin forbidden.");
                return new Response('Forbidden', { status: 403 });
             }
             console.log("DEBUG: OPTIONS preflight allowed. Sending 204.");
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

        // --- Only POST allowed from here ---
        if (req.method !== 'POST') {
             console.log(`DEBUG: Method ${req.method} not allowed. Sending 405.`);
             return new Response('Method Not Allowed', {
                status: 405,
                headers: { 'Allow': 'POST, OPTIONS' }
             });
        }

        // --- CORS on actual POST ---
        console.log(`DEBUG: Handling POST from origin: ${origin}`);
        // ... (rest of your POST logic including parsing, DB insert, etc.) ...
         if (!ALLOWED_ORIGINS.has(origin)) {
             console.log("DEBUG: POST origin forbidden.");
             return new Response('Forbidden', { status: 403 });
         }
         const corsHeaders = { 'Access-Control-Allow-Origin': origin };
         console.log("DEBUG: POST origin allowed.");

         // --- Parse JSON body ---
         // ... (your try/catch block for parsing) ...
         let payload: any;
         try {
            payload = await req.json();
            console.log("DEBUG: POST body parsed:", payload);
         } catch (e) {
            console.error("ERROR: Failed to parse POST JSON body:", e);
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
               status: 400,
               headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
         }
         // ... (rest of body processing, IP/UA capture, DB Insert) ...
         console.log("DEBUG: Attempting Supabase insert...");
         const { event_type, event_data } = payload; // Assuming parsing succeeded
         const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || (req.conn?.remoteAddr as any)?.hostname || 'unknown';
         const ua = req.headers.get('user-agent') || 'unknown';
         const sessionId = req.headers.get('x-session-id') || 'none';
         const { error: dbError } = await supabase.from('events').insert({ ip_address: ip, user_agent: ua, session_id: sessionId, event_type, event_data });
         // ... (DB error handling) ...
         if (dbError) {
            console.error('ERROR: Supabase insert error:', dbError); // Log the actual DB error
            return new Response(JSON.stringify({ error: "Database insert failed", details: dbError.message }), {
               status: 500,
               headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
         }

         console.log("DEBUG: Supabase insert successful.");
         // --- Done! ---
         return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         });

    } // End of async handler function
}); // End of serve call

console.log("DEBUG: Function server setup complete.");
