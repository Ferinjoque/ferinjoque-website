// supabase/functions/custom-email-event-handler/index.ts
import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "supabase"; // Relies on import_map.json
import { verify } from "djwt"; // Relies on import_map.json

console.log("DEBUG: custom-email-event-handler function starting with JWT verification (using import map)...");

const HOOK_SECRET = Deno.env.get("SUPA_AUTH_HOOK_SECRET");
const SUPABASE_PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF"); // Potentially for 'aud' claim

if (!HOOK_SECRET) {
  console.error("FATAL ERROR: SUPA_AUTH_HOOK_SECRET environment variable is not set.");
}
if (!SUPABASE_PROJECT_REF && HOOK_SECRET) {
  console.warn("WARN: SUPABASE_PROJECT_REF environment variable is not set. JWT 'aud' claim verification might be affected.");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailHookPayload {
  action: 'send_email';
  type: 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change' | string;
  email: string;
  user_id: string;
  data?: {
    token?: string;
    redirect_to?: string;
    [key: string]: any;
  };
}

async function verifySupabaseHookJwt(req: Request, secretFromEnv: string): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("Hook Verification: Missing or malformed Authorization header. Request will be rejected.");
    return false;
  }
  const token = authHeader.substring(7); // Remove "Bearer "

  // MODIFICATION: Using the secretFromEnv directly without stripping any prefix.
  const actualSecret = secretFromEnv;
  console.log("Hook Verification: Using provided secret directly (no prefix stripping):", actualSecret);

  if (!actualSecret) {
    // This case should ideally be caught by the HOOK_SECRET check before calling this function,
    // but as a safeguard:
    console.error("Hook Verification: Secret to use for verification is empty. Ensure SUPA_AUTH_HOOK_SECRET is correctly set.");
    return false;
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(actualSecret), // Use the UNMODIFIED secret from env
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );

    const decodedPayload = await verify(token, cryptoKey);
    console.log("Hook JWT successfully verified (using unmodified secret).");
    // ... (optional stricter claim validation can go here) ...
    return true;
  } catch (err) {
    console.error(`Hook JWT verification failed (using unmodified secret): ${err.message} (Error Name: ${err.name}). Ensure SUPA_AUTH_HOOK_SECRET is correct and matches the one configured for the hook in the Supabase dashboard.`);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (HOOK_SECRET) {
    const isVerified = await verifySupabaseHookJwt(req, HOOK_SECRET);
    if (!isVerified) {
      return new Response(JSON.stringify({ error: "Unauthorized. Invalid hook signature." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  } else {
    console.warn("WARNING: SUPA_AUTH_HOOK_SECRET is not set. Hook request is not being verified. This is insecure for production.");
    // In a production environment, you should strictly require the secret and fail if it's not present.
    // Example:
    // return new Response(JSON.stringify({ error: "Configuration error: Hook secret missing." }), {
    //   status: 500,
    //   headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    // });
  }

  try {
    const payload: EmailHookPayload = await req.json();
    console.log("Custom Email Event Handler Hook received payload (after verification):", JSON.stringify(payload, null, 2));

    if (payload.type === 'signup') {
      console.log(`Supabase Auth tried to send a 'signup' email for ${payload.email}. Suppressing it as the custom client-side flow will handle this type of email via the 'initiate-email-verification' function.`);
      return new Response(
        JSON.stringify({ message: "Signup email event received by hook; custom client flow is responsible for sending." }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.warn(`Email hook received for type: '${payload.type}' for ${payload.email}. No custom sending action defined in this hook for this type. Supabase's default sending for this type will be suppressed by this hook.`);
    return new Response(
      JSON.stringify({ message: `Email event type '${payload.type}' received and acknowledged. Default Supabase email for this type is suppressed by this hook.` }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in custom-email-event-handler function (after payload processing):", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error in email hook." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
