import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "supabase";

console.log("DEBUG: complete-email-verification function starting...");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL ERROR: Missing required Supabase environment variables for complete-email-verification.");
  throw new Error("Server configuration error for email completion.");
}

const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing verification token." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Fetch the token from the database
    const { data: verificationRecord, error: fetchError } = await supabaseAdmin
      .from("email_verifications")
      .select("id, user_id, expires_at")
      .eq("token", token)
      .single();

    if (fetchError || !verificationRecord) {
      console.warn("Invalid or non-existent token:", token, fetchError);
      return new Response(JSON.stringify({ error: "Invalid or expired verification token." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (new Date(verificationRecord.expires_at) < new Date()) {
      console.warn("Expired token used:", token);
      await supabaseAdmin.from("email_verifications").delete().eq("id", verificationRecord.id);
      return new Response(JSON.stringify({ error: "Verification token has expired." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Mark user's email as confirmed in auth.users
    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      verificationRecord.user_id,
      { email_confirm: true }
    );

    if (updateUserError) {
      console.error("Error updating user email confirmation status:", updateUserError);
      throw new Error(`Failed to confirm email: ${updateUserError.message}`);
    }

    // Delete the used token
    await supabaseAdmin.from("email_verifications").delete().eq("id", verificationRecord.id);

    console.log(`DEBUG: Email successfully verified for user ${verificationRecord.user_id}`);
    return new Response(JSON.stringify({ success: true, message: "Email successfully verified." }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in complete-email-verification function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error during verification." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
