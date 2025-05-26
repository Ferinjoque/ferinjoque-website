import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "supabase";

console.log("DEBUG: custom-email-event-handler function starting...");

// This function is called BY Supabase Auth itself when it intends to send an email.
// We don't need Resend keys here unless we want this hook itself to send emails.
// For now, its main job is to intercept and potentially suppress emails.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Supabase will call this internally
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailHookPayload {
  action: 'send_email'; // This will always be 'send_email' for this hook type
  type: 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change' | string; // Supabase email types
  email: string;
  user_id: string;
  data?: {
    token?: string;
    redirect_to?: string;
    [key: string]: any;
  };
  // ... other properties depending on the email type
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const payload: EmailHookPayload = await req.json();
    console.log("Custom Email Event Handler Hook received payload:", JSON.stringify(payload, null, 2));

    // If Supabase Auth tries to send a 'signup' (email confirmation) email,
    // we will suppress it because our client-side flow (`handleRegistration` in rpg.js)
    // will call the `initiate-email-verification` function to send a custom email via Resend.
    if (payload.type === 'signup') {
      console.log(`Supabase Auth tried to send a 'signup' email for ${payload.email}. Suppressing it as the custom client-side flow will handle this type of email via the 'initiate-email-verification' function.`);
      // By returning a 200 OK, we acknowledge the hook. Supabase Auth will consider the email "handled"
      // and will not proceed to send its own version of this 'signup' email.
      return new Response(
        JSON.stringify({ message: "Signup email event received by hook; custom client flow is responsible for sending." }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For any other email types (e.g., 'recovery', 'magiclink', 'invite', 'email_change'),
    // this hook is currently not taking specific action to send them via Resend.
    // This means if you trigger these actions in Supabase (e.g., a password reset request via Supabase methods),
    // and this hook is active, Supabase will call this hook. Since we are not re-sending them here,
    // THOSE EMAILS WILL ALSO BE SUPPRESSED by default if not handled.
    // You would need to add logic here to send those emails via Resend if you want this hook to manage them.
    // For now, we are focused on stopping the duplicate signup email.

    console.warn(`Email hook received for type: '${payload.type}' for ${payload.email}. No custom sending action defined in this hook for this type. Supabase's default sending for this type will be suppressed.`);
    return new Response(
      JSON.stringify({ message: `Email event type '${payload.type}' received and acknowledged. Default Supabase email for this type is suppressed by this hook.` }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200, // Important to return 200 OK
      }
    );

  } catch (error) {
    console.error("Error in custom-email-event-handler function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error in email hook." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
