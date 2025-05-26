// supabase/functions/custom-email-event-handler/index.ts (Simplified for Logging Test)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Using direct URL for simplicity in this test

console.log("MINIMAL HANDLER: Top-level log reached. Function is alive.");

serve(async (req: Request) => {
  console.log(`MINIMAL HANDLER: Request received. Method: ${req.method}`);
  
  let requestBodyText = "[Could not read body]";
  try {
    requestBodyText = await req.text(); // Just get the raw body as text
    console.log("MINIMAL HANDLER: Raw request body:", requestBodyText);
  } catch (e) {
    console.error("MINIMAL HANDLER: Error reading request body:", e.message);
  }

  // For this test, always respond with 200 OK to see if Supabase Auth is satisfied
  // and to check if the client-side error changes.
  const responsePayload = {
    hook_received: true,
    message: "Minimal handler processed the request.",
    method: req.method,
    body_preview: requestBodyText.substring(0, 100) // Send back a preview
  };

  return new Response(
    JSON.stringify(responsePayload),
    {
      headers: { "Content-Type": "application/json" },
      status: 200, // Crucial: respond 200 to Auth Hook
    }
  );
});
