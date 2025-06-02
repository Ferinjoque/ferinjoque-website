import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

console.log("DEBUG: initiate-email-verification function starting...");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Ensure this is a sending address authorized with Resend (e.g., noreply@yourdomain.com)
const VERIFICATION_FROM_EMAIL = Deno.env.get("VERIFICATION_FROM_EMAIL") || "verification@injoque.dev"; // Changed from WEEKLY_REPORT_FROM_EMAIL
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://injoque.dev";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !VERIFICATION_FROM_EMAIL) {
  console.error("FATAL ERROR: Missing required environment variables for initiate-email-verification (URL, Service Key, Resend Key, From Email).");
  throw new Error("Server configuration error for email verification.");
}

const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://injoque.dev", // Restrict in production
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

    const userName = email.split('@')[0] || 'Warden'; // Extract username or default
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token valid for 24 hours

    // Store the verification token, associated user, and expiry
    const { error: dbError } = await supabaseAdmin
      .from("email_verifications")
      .insert({
        user_id: userId,
        email: email, // Storing email for reference can be useful
        token: token,
        expires_at: expiresAt.toISOString(),
        is_verified: false // Initialize as not verified
      });

    if (dbError) {
      console.error("Database error storing verification token:", dbError);
      throw new Error(`Failed to store verification token: ${dbError.message}`);
    }

    const verificationLink = `${APP_BASE_URL}/rpg.html?type=email_verification&token=${token}`;

    // Cleaned HTML content (glitch animation CSS and spans removed)
    let emailHtmlBody = `
<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <title> Eco-Echoes Account Activation </title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
    #outlook a { padding: 0; }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    p { display: block; margin: 13px 0; }
  </style>
  <link href="https://fonts.googleapis.com/css?family=Roboto:400,700" rel="stylesheet" type="text/css">
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Roboto:400,700);
  </style>
  <style type="text/css">
    @media only screen and (min-width:480px) {
      .mj-column-px-600 { width: 600px !important; max-width: 600px; }
      .mj-column-per-100 { width: 100% !important; max-width: 100%; }
    }
  </style>
</head>
<body style="word-spacing:normal;background-color:#0a0f14;">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;"> Confirm your registration to access the GAIA Prime interface. </div>
  <div style="background-color:#0a0f14;">
    <div style="margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
              <div class="mj-column-px-600 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#12181f;border:1px solid #00ff9B;border-radius:8px;vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;padding-top:30px;padding-bottom:10px;word-break:break-word;">
                        <div style="font-family:'Roboto', 'Consolas', 'Lucida Console', Monaco, monospace;font-size:28px;font-weight:bold;letter-spacing:1px;line-height:1.7;text-align:center;color:#00ff9B;">ECO-ECHOES</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;padding-bottom:20px;word-break:break-word;">
                        <div style="font-family:'Roboto', 'Consolas', 'Lucida Console', Monaco, monospace;font-size:16px;letter-spacing:2px;line-height:1.7;text-align:center;text-transform:uppercase;color:#4CAF50;">SYSTEM//AUTH_MODULE</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:5px 0 15px 0;word-break:break-word;">
                        <p style="border-top:solid 1px #00ff9B;font-size:1px;margin:0px auto;width:80%;"></p>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:15px 30px;word-break:break-word;">
                        <div style="font-family:'Roboto', 'Consolas', 'Lucida Console', Monaco, monospace;font-size:16px;line-height:1.7;text-align:left;color:#d0d0d0;">
                          <h2 style="color: #e0e0e0; font-size: 20px; margin-bottom:10px;">Access Protocol Initiated // Warden <span style="color:#00ff9B; font-weight:bold;">%%USER_NAME%%</span></h2>
                          <p>Welcome to the Eco-Echoes network. Your registration sequence is nearing completion.</p>
                          <p>To fully activate your GAIA Prime interface and synchronize your Warden profile, please verify your communication channel via the link below:</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" vertical-align="middle" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                          <tr>
                            <td align="center" bgcolor="#00ff9B" role="presentation" style="border:none;border-radius:4px;cursor:auto;mso-padding-alt:12px 25px;background:#00ff9B;" valign="middle">
                              <a href="%%VERIFICATION_URL%%" style="display:inline-block;background:#00ff9B;color:#0A0A0A;font-family:'Roboto', Arial, sans-serif;font-size:16px;font-weight:bold;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:12px 25px;mso-padding-alt:0px;border-radius:4px;" target="_blank"> VERIFY CHANNEL & ACTIVATE </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:15px 30px;padding-top:20px;padding-bottom:20px;word-break:break-word;">
                        <div style="font-family:'Roboto', 'Consolas', 'Lucida Console', Monaco, monospace;font-size:12px;line-height:1.5;text-align:center;color:#888888; word-break:break-all;">
                          <p>Manual Override (if primary link fails):<br />%%VERIFICATION_URL%%</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:0 30px;word-break:break-word;">
                        <p style="border-top:solid 1px #333333;font-size:1px;margin:0px auto;width:100%;"></p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:20px 30px;word-break:break-word;">
                        <div style="font-family:'Roboto', 'Consolas', 'Lucida Console', Monaco, monospace;font-size:12px;line-height:1.7;text-align:center;color:#777777;">This transmission is intended for the registered user of injoque.dev. If this request is unknown, disregard this signal. Unauthorized access is a violation of network protocol 7.3. <br /><br /> &copy; 2025 // Fernando Injoque // GAIA Prime Network Administration</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
              <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:'Roboto', 'Consolas', 'Lucida Console', Monaco, monospace;font-size:10px;line-height:1.7;text-align:center;color:#555555;">Eco-Echoes RPG</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
    `;

    // Replace placeholders
    emailHtmlBody = emailHtmlBody.replace(/%%USER_NAME%%/g, userName);
    emailHtmlBody = emailHtmlBody.replace(/%%VERIFICATION_URL%%/g, verificationLink);

    // Send email using Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: VERIFICATION_FROM_EMAIL, // Use the dedicated FROM address
        to: [email],
        subject: "Confirm Your Email for Eco-Echoes RPG",
        html: emailHtmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errorBody);
      throw new Error(`Failed to send verification email: ${resendResponse.status} - ${errorBody}`);
    }

    console.log(`DEBUG: Verification email initiated for ${email} (user ${userId}) with token ${token}.`);
    return new Response(JSON.stringify({ success: true, message: "Verification email sent." }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in initiate-email-verification function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
