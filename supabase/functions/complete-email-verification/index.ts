import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Using specific version from your import_map
import { createClient, SupabaseClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"; // Using specific version

console.log("DEBUG: complete-email-verification function starting...");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL ERROR: Missing required Supabase environment variables for complete-email-verification.");
  throw new Error("Server configuration error for email completion.");
}

const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // In production, restrict to your app's domain
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

    // Fetch the token from the database, including the user_id and current is_verified status
    const { data: verificationRecord, error: fetchError } = await supabaseAdmin
      .from("email_verifications")
      .select("id, user_id, email, expires_at, is_verified") // Added email and is_verified for richer logging/checks
      .eq("token", token)
      // .eq('is_verified', false) // Optional: only process tokens not yet verified
      .single();

    if (fetchError || !verificationRecord) {
      console.warn("Invalid, already used, or non-existent token:", token, fetchError);
      return new Response(JSON.stringify({ error: "Invalid or expired verification token." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (verificationRecord.is_verified) {
        console.log(`DEBUG: Token ${token} for user ${verificationRecord.user_id} (email: ${verificationRecord.email}) has already been verified.`);
        // Decide how to handle already verified tokens. For now, treat as success.
        return new Response(JSON.stringify({ success: true, message: "Email already verified." }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    if (new Date(verificationRecord.expires_at) < new Date()) {
      console.warn("Expired token used:", token, "for user:", verificationRecord.user_id);
      // Optionally delete or mark as expired in your table
      // For now, just deleting the specific expired token record:
      await supabaseAdmin.from("email_verifications").delete().eq("id", verificationRecord.id);
      return new Response(JSON.stringify({ error: "Verification token has expired." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 1. Mark user's email as confirmed in auth.users (for Supabase internals)
    const { error: updateUserAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      verificationRecord.user_id,
      { email_confirm: true }
    );

    if (updateUserAuthError) {
      console.error("Error updating user's auth.users email_confirm status:", updateUserAuthError);
      // Depending on severity, you might still want to update your custom table
      // or throw an error. For now, we'll log and attempt to proceed.
      // throw new Error(`Failed to update Supabase auth confirmation: ${updateUserAuthError.message}`);
    }

    // 2. Update your custom 'email_verifications' table
    // Mark this specific token record as verified and nullify the token to prevent reuse.
    const { error: updateCustomRecordError } = await supabaseAdmin
      .from("email_verifications")
      .update({
        is_verified: true,
        token: null, // Nullify the token after successful verification
        expires_at: null // Nullify expiry as it's no longer relevant
      })
      .eq("id", verificationRecord.id);

    if (updateCustomRecordError) {
      console.error("Error updating custom 'is_verified' status in email_verifications table:", updateCustomRecordError);
      // This is a critical error for your custom flow's integrity.
      throw new Error(`Failed to update custom verification record: ${updateCustomRecordError.message}`);
    }

    console.log(`DEBUG: Email successfully verified (Supabase auth and custom table) for user ${verificationRecord.user_id} (email: ${verificationRecord.email})`);
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
