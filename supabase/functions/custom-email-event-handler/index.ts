import { serve } from "std/http/server.ts";

console.log("DEBUG: custom-email-event-handler function starting for Webhook Verification...");

const HOOK_SECRET = Deno.env.get("SUPA_AUTH_HOOK_SECRET");

if (!HOOK_SECRET) {
  console.error("INITIALIZATION FATAL ERROR: SUPA_AUTH_HOOK_SECRET environment variable is not set. This function cannot operate securely.");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
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

async function verifySupabaseWebhook(
  req: Request,
  rawBody: string,
  secret: string
): Promise<boolean> {
  const webhookId = req.headers.get("webhook-id");
  const webhookSignature = req.headers.get("webhook-signature");
  const webhookTimestamp = req.headers.get("webhook-timestamp");

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    console.warn("Webhook Verification: Missing one or more webhook headers (id, signature, timestamp).");
    return false;
  }

  let actualSecret = secret;
  if (secret.startsWith("v1,")) {
    console.log("Webhook Verification: Detected 'v1,' prefix in secret. Using the part after the comma.");
    actualSecret = secret.substring(3);
  }
  
  if (!actualSecret) {
    console.error("Webhook Verification: Effective secret is empty after processing.");
    return false;
  }

  const signatureParts = webhookSignature.split(",");
  const signatureVersion = signatureParts[0];
  const providedSignature = signatureParts[1];

  if (signatureVersion !== "v1" || !providedSignature) {
    console.warn(`Webhook Verification: Invalid signature format. Expected 'v1,signature', got '${webhookSignature}'.`);
    return false;
  }

  const stringToSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(actualSecret);
    const dataToSign = encoder.encode(stringToSign);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
    
    // Convert ArrayBuffer to Base64
    const signatureBytes = new Uint8Array(signatureBuffer);
    let binary = '';
    for (let i = 0; i < signatureBytes.byteLength; i++) {
        binary += String.fromCharCode(signatureBytes[i]);
    }
    const calculatedSignature = btoa(binary);    

    if (calculatedSignature === providedSignature) {
      console.log("Webhook signature successfully verified.");
      return true;
    } else {
      console.warn("Webhook Verification: Signature mismatch.");
      console.log(`Provided: ${providedSignature}, Calculated: ${calculatedSignature}`);
      return false;
    }
  } catch (err) {
    console.error(`Webhook Verification: Error during signature calculation: ${err.message}`, err);
    return false;
  }
}

serve(async (req: Request) => {
  console.log(`Invocation received for custom-email-event-handler. Method: ${req.method}`);

  const headersObject: { [key: string]: string } = {};
  for (const [key, value] of req.headers.entries()) {
    headersObject[key] = value;
  }
  console.log("DEBUG: Incoming request headers:", JSON.stringify(headersObject, null, 2));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!HOOK_SECRET) {
    console.error("CRITICAL RUNTIME ERROR: SUPA_AUTH_HOOK_SECRET not available. Hook cannot proceed.");
    return new Response(JSON.stringify({ error: "Webhook security configuration error on server." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let rawBody;
  try {
    rawBody = await req.text();
  } catch (bodyError) {
    console.error("Error reading request body:", bodyError);
    return new Response(JSON.stringify({ error: "Could not read request body."}), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json"},
    });
  }
  
  const isVerified = await verifySupabaseWebhook(req, rawBody, HOOK_SECRET);
  if (!isVerified) {
    console.warn("Webhook verification failed. Rejecting request.");
    return new Response(JSON.stringify({ error: "Unauthorized. Invalid webhook signature." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  console.log("Webhook VERIFIED. Proceeding to process payload.");
  try {
    const payload: EmailHookPayload = JSON.parse(rawBody);
    console.log("Custom Email Event Handler Hook received payload (VERIFIED):", JSON.stringify(payload, null, 2));

    if (payload.type === 'signup') {
      console.log(`Supabase Auth tried to send a 'signup' email for ${payload.email}. Suppressing it.`);
      return new Response(
        JSON.stringify({ message: "Signup email event received and acknowledged by hook." }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.warn(`Email hook received for type: '${payload.type}' for ${payload.email}. Default Supabase email suppressed.`);
    return new Response(
      JSON.stringify({ message: `Email event type '${payload.type}' received and acknowledged. Default Supabase email suppressed.` }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing payload after verification:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "Error processing payload."}), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
