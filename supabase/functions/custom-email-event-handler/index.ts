// supabase/functions/custom-email-event-handler/index.ts
import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "supabase"; // Relies on import_map.json
import { verify } from "djwt"; // Relies on import_map.json

console.log("DEBUG: custom-email-event-handler function starting with JWT verification (using import map)...");

const HOOK_SECRET = Deno.env.get("SUPA_AUTH_HOOK_SECRET");
const SUPABASE_PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF"); // Potentially for 'aud' claim

// Initial checks for environment variables at the top level (these logs will appear once on function cold start)
if (!HOOK_SECRET) {
  console.error("INITIALIZATION FATAL ERROR: SUPA_AUTH_HOOK_SECRET environment variable is not set. This function cannot operate securely.");
}
if (!SUPABASE_PROJECT_REF && HOOK_SECRET) { // Only warn if project ref is missing but hook secret is present (as it's optional for basic verify)
  console.warn("INITIALIZATION WARN: SUPABASE_PROJECT_REF environment variable is not set. Stricter JWT 'aud' claim verification might be affected or skipped.");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // You might want to restrict this to your actual domain in production
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Added OPTIONS
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
    console.warn("Hook Verification: Missing or malformed Authorization header. Request will be rejected by JWT check.");
    return false;
  }
  const token = authHeader.substring(7); // Remove "Bearer "

  let actualSecret = secretFromEnv;
  if (secretFromEnv.startsWith("v1,")) {
    console.log("Hook Verification: Detected 'v1,' prefix in secret. Using the part after the comma for verification.");
    actualSecret = secretFromEnv.substring(secretFromEnv.indexOf(',') + 1);
  } else {
    console.log("Hook Verification: Using provided secret as is (no 'v1,' prefix detected).");
  }

  if (!actualSecret) {
    console.error("Hook Verification: Effective secret is empty after processing. Cannot verify. Ensure SUPA_AUTH_HOOK_SECRET is correctly set.");
    return false;
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(actualSecret), // Use the processed secret
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );

    const decodedPayload = await verify(token, cryptoKey);
    console.log("Hook JWT successfully verified.");
    // You can add aud/iss checks here using decodedPayload if needed:
    // Example: if (decodedPayload.aud !== SUPABASE_PROJECT_REF) { console.error("Invalid JWT audience"); return false; }
    // Example: if (decodedPayload.iss !== `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1`) { console.error("Invalid JWT issuer"); return false; }
    return true;
  } catch (err) {
    console.error(`Hook JWT verification failed: ${err.message} (Error Name: ${err.name}). Ensure SUPA_AUTH_HOOK_SECRET is correct and matches the one configured for the hook in the Supabase dashboard.`);
    return false;
  }
}

serve(async (req: Request) => {
  // This top-level log inside serve should appear for every invocation
  console.log(`Invocation received for custom-email-event-handler. Method: ${req.method}`);

  // TEMPORARY: Log all incoming headers
  const headersObject: { [key: string]: string } = {}; // Define type for headersObject
  for (const [key, value] of req.headers.entries()) {
    headersObject[key] = value;
  }
  console.log("DEBUG: Incoming request headers:", JSON.stringify(headersObject, null, 2));
  // END TEMPORARY LOGGING

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // **REFINED SECRET CHECK BLOCK**
  if (!HOOK_SECRET) {
    // This console.error should appear in logs if the secret is not set AT ALL.
    console.error("CRITICAL RUNTIME ERROR: SUPA_AUTH_HOOK_SECRET environment variable is not available. Hook cannot proceed securely.");
    return new Response(JSON.stringify({ error: "Webhook security configuration error on server: Secret not configured." }), {
      status: 500, // Internal Server Error because the server (function) is misconfigured
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // If HOOK_SECRET is present, proceed with JWT verification.
  const isVerified = await verifySupabaseHookJwt(req, HOOK_SECRET);
  if (!isVerified) {
    // verifySupabaseHookJwt already logs the specific reason for JWT failure.
    // A 401 status is appropriate here. Supabase Auth should see this and might report "Error running hook URI".
    return new Response(JSON.stringify({ error: "Unauthorized. Invalid hook signature." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  // **END OF REFINED SECRET CHECK BLOCK**

  // If JWT is verified (isVerified is true), THEN proceed.
  console.log("Hook JWT VERIFIED. Proceeding to process payload.");
  try {
    const payload: EmailHookPayload = await req.json();
    console.log("Custom Email Event Handler Hook received payload (JWT VERIFIED):", JSON.stringify(payload, null, 2));

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

    // For any other email types (recovery, magiclink, invite, email_change),
    // this hook will currently suppress Supabase's default email without sending its own.
    // If you want to customize those emails too, you'd add logic here to call Resend, similar
    // to what you have in 'initiate-email-verification'.
    console.warn(`Email hook received for type: '${payload.type}' for ${payload.email}. No custom sending action defined in this hook for this type. Supabase's default sending for this type will be suppressed by this hook.`);
    return new Response(
      JSON.stringify({ message: `Email event type '${payload.type}' received and acknowledged. Default Supabase email for this type is suppressed by this hook.` }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200, // Important to return 200 to Supabase Auth
      }
    );

  } catch (error) {
    console.error("Error in custom-email-event-handler function (after JWT verification, during payload processing):", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Internal server error in email hook after verification." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
