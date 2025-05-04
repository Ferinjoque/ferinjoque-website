// supabase/functions/track/index.ts - TEMPORARY TEST CODE
// Note: No external imports needed for this basic test

const ALLOWED_ORIGIN_1 = 'https://ferinjoque.github.io';
const ALLOWED_ORIGIN_2 = 'https://injoque.dev';

console.log("Basic test function starting..."); // Log start

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin") || "";
  console.log(`Received: ${req.method} ${url.pathname} from origin: ${origin}`); // Log request

  // --- CORS Preflight Handling ---
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request.");
    // Check if origin is allowed
    const isAllowed = origin === ALLOWED_ORIGIN_1 || origin === ALLOWED_ORIGIN_2;
    if (isAllowed) {
      console.log("Origin allowed. Sending 204 with CORS headers.");
      return new Response(null, { // Use 204 No Content
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-session-id", // Match your actual request headers
          "Access-Control-Max-Age": "86400",
        },
      });
    } else {
      console.log("Origin NOT allowed.");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // --- Handle POST (Basic Response) ---
  if (req.method === "POST") {
     console.log("Handling POST request.");
     // Check if origin is allowed for POST too
     const isAllowed = origin === ALLOWED_ORIGIN_1 || origin === ALLOWED_ORIGIN_2;
     if (!isAllowed) {
         console.log("Origin NOT allowed for POST.");
         return new Response("Forbidden", { status: 403 });
     }

     try {
        const body = await req.json();
        console.log("Received POST body:", body);
        // In a real scenario, you'd process the body here
     } catch (e) {
         console.error("Error reading POST body:", e);
         // Ignore body reading errors for this basic test
     }

     console.log("Sending basic POST success response with CORS header.");
     return new Response(JSON.stringify({ success: true, message: "Basic test received POST" }), {
       status: 200,
       headers: {
         "Access-Control-Allow-Origin": origin, // Still need this for the actual response
         "Content-Type": "application/json",
       },
     });
  }

  // --- Default Response (Method Not Allowed / Not Found) ---
  console.log(`Method ${req.method} not handled. Returning 405.`);
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST, OPTIONS" }, // Let browser know what's allowed
  });
});
