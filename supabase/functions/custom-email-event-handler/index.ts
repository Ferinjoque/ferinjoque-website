// supabase/functions/custom-email-event-handler/index.ts (Ultra-Minimal Logging Test)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// This log should appear if the Deno runtime for this function even starts
console.log("ULTRA-MINIMAL HANDLER: Top-level execution log. Function file is being read.");

serve(async (req: Request) => {
  // This log should appear if Supabase Auth successfully makes an HTTP request to this function
  console.log(`ULTRA-MINIMAL HANDLER: Request received! Method: ${req.method}`);
  
  const requestTimestamp = new Date().toISOString();
  let bodyText = "[Not attempted to read body yet]"; // Default

  try {
    // Log all headers to see what's coming in, especially Authorization
    const headersObject = Object.fromEntries(req.headers.entries());
    console.log("ULTRA-MINIMAL HANDLER: Request Headers:", JSON.stringify(headersObject, null, 2));

    bodyText = await req.text();
    console.log("ULTRA-MINIMAL HANDLER: Raw Request Body:", bodyText);
  } catch (e) {
    console.error("ULTRA-MINIMAL HANDLER: Error reading request body or headers:", e.message);
    bodyText = `[Error reading body: ${e.message}]`;
  }

  // ALWAYS return 200 OK for this test to see if it satisfies the hook mechanism
  // and stops the "Error running hook URI" on the client.
  return new Response(
    JSON.stringify({
      message: "Ultra-minimal hook handler acknowledged the request.",
      timestamp: requestTimestamp,
      received_body_preview: bodyText.substring(0, 200)
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
});
