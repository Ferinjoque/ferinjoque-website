import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

console.log("DEBUG: initiate-email-verification function starting...");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEEKLY_REPORT_FROM_EMAIL = Deno.env.get("WEEKLY_REPORT_FROM_EMAIL");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://injoque.dev";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !WEEKLY_REPORT_FROM_EMAIL) {
  console.error("FATAL ERROR: Missing required environment variables for initiate-email-verification.");
  throw new Error("Server configuration error for email verification.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://injoque.dev", // Or be more specific, e.g., your frontend URL
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing userId or email." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const token = crypto.randomUUID(); // Simple UUID token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token valid for 24 hours

    // Store the token in the database
    const { error: dbError } = await supabaseAdmin
      .from("email_verifications")
      .insert({
        user_id: userId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("Database error storing verification token:", dbError);
      throw new Error(`Failed to store verification token: ${dbError.message}`);
    }

    const verificationLink = `${APP_BASE_URL}/rpg.html?type=email_verification&token=${token}`;

    // Send email using Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: WEEKLY_REPORT_FROM_EMAIL, // Use the configured "from" email
        to: [email],
        subject: "Confirm Your Email for Eco-Echoes RPG",
        html: `
          <h1>Welcome to Eco-Echoes!</h1>
          <p>Please confirm your email address by clicking the link below:</p>
          <p><a href="${verificationLink}">Verify Email Address</a></p>
          <p>If you didn't register for Eco-Echoes, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send verification email: ${resendResponse.status} - ${errorText}`);
    }

    console.log(`DEBUG: Verification email sent to ${email} for user ${userId}`);
    return new Response(JSON.stringify({ success: true, message: "Verification email sent." }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in initiate-email-verification function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
