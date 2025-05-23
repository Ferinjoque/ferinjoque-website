// supabase/functions/rpg-ai-engine/index.ts
import { serve } from "std/http/server.ts"; // Using import map

console.log("DEBUG: rpg-ai-engine function starting...");

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
// Ensure you are using the correct model name if you change it.
// Defaulting to gemini-1.5-flash-latest as a robust starting point.
// const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest"; // More cost-effective for frequent calls
const GEMINI_MODEL_NAME = "gemini-2.0-flash-lite"; // As per your last request
// const GEMINI_MODEL_NAME = "gemini-1.5-pro-latest"; // More powerful, potentially higher cost/slower

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GOOGLE_AI_API_KEY}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // IMPORTANT: For production, restrict this to your actual domain.
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey", // Ensure all expected headers are listed
};

serve(async (req: Request) => {
  console.log(`DEBUG: Received invocation: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("DEBUG: Handling OPTIONS request, sending 200 OK with CORS headers.");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    console.warn(`WARN: Method ${req.method} not allowed. Only POST and OPTIONS are handled.`);
    return new Response(JSON.stringify({ error: "Method Not Allowed. Please use POST." }), {
      status: 405, // Explicitly return 405 for non-POST, non-OPTIONS
      headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  if (!GOOGLE_AI_API_KEY) {
    console.error("FATAL ERROR: Missing GOOGLE_AI_API_KEY in Supabase secrets.");
    return new Response(JSON.stringify({ error: "Server configuration error: Missing AI API Key." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    console.log("DEBUG: Parsed request body:", body);
    const {
      currentGameState,
      playerCommand,
      turnHistory,
      gameTheme
    } = body;

    if (!currentGameState || typeof playerCommand === 'undefined' || !turnHistory || !gameTheme) {
      console.error("ERROR: Invalid request payload. Missing one or more required fields.");
      return new Response(JSON.stringify({ error: "Invalid request payload. Required fields: currentGameState, playerCommand, turnHistory, gameTheme." }), {
        status: 400, // Bad Request
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    
    const geminiHistory = turnHistory.map(turn => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }]
    }));

    // System instruction prompt (refined for clarity and to encourage better JSON)
    const systemInstruction = `You are GAIA Prime, an AI game master for a text-based RPG called Eco-Echoes.
Themes: AI ethics, environmental sustainability in a sci-fi world. Player is "Warden".
Current Situation: ${currentGameState.currentLocationDescription || 'Just starting.'}
Player: ${currentGameState.playerName}, Inv: ${currentGameState.inventory.length > 0 ? currentGameState.inventory.join(', ') : 'empty'}, Stability: ${currentGameState.sectorStability}%, Sync: ${currentGameState.aiSync}%
Player Command: "${playerCommand}"

Task: Generate the next story segment.
Response MUST be a VALID JSON object like this:
{
  "storyText": "Narrative of what happens. Be descriptive and thematic.",
  "choices": ["Actionable choice 1", "Actionable choice 2", "Actionable choice 3"],
  "itemsFound": ["new_item_1"],
  "statusUpdates": [{"statusName": "sectorStability", "newValue": ${currentGameState.sectorStability - 5}, "reason": "Reason if any"}],
  "newLocationDescription": "Brief updated location summary if changed significantly."
}
Rules:
- storyText: Mandatory, detailed.
- choices: Array of 2-4 short, actionable strings. If none specific, suggest general ones.
- itemsFound: Array of strings. Empty [] if none.
- statusUpdates: Array of objects. Empty [] if no change. Include 'statusName' and 'newValue'. 'reason' optional.
- newLocationDescription: Update if location/situation changes substantially.
- Adhere to themes: ${gameTheme}.
- Output ONLY the valid JSON object. No other text, no markdown.
`;

    const requestBodyForGemini = {
      contents: [
        ...geminiHistory,
        { role: "user", parts: [{text: systemInstruction}] },
      ],
      generationConfig: {
        temperature: 0.75, // Slightly higher for more creative variance
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, 
        // responseMimeType: "application/json", // Enable if supported by the exact Gemini model version for strict JSON output
      },
       safetySettings: [ // Standard safety settings
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ]
    };
    console.log("DEBUG: Sending to Gemini API URL:", GEMINI_API_URL);
    // console.log("DEBUG: Sending to Gemini this payload:", JSON.stringify(requestBodyForGemini, null, 2));


    const aiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBodyForGemini),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`ERROR: Gemini API request failed: ${aiResponse.status} ${aiResponse.statusText}`, errorText);
      throw new Error(`Gemini API request failed: ${aiResponse.status} ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    // console.log("DEBUG: Raw Gemini Result:", JSON.stringify(aiResult, null, 2));

    let responseJsonText = "";
    if (aiResult.candidates && aiResult.candidates[0] && aiResult.candidates[0].content && aiResult.candidates[0].content.parts && aiResult.candidates[0].content.parts[0]) {
      responseJsonText = aiResult.candidates[0].content.parts[0].text;
    } else {
      if (aiResult.candidates && aiResult.candidates[0] && aiResult.candidates[0].finishReason === 'SAFETY') {
        console.warn("WARN: Gemini response blocked due to safety settings:", aiResult.candidates[0].safetyRatings);
        throw new Error("AI response blocked due to safety settings. Please rephrase or try a different command.");
      }
      console.error("ERROR: Unexpected response structure from Gemini API.", aiResult);
      throw new Error("Unexpected response structure from Gemini API.");
    }
    
    // Clean potential markdown ```json ... ``` wrapper
    responseJsonText = responseJsonText.replace(/^```json\s*([\s\S]*?)\s*```$/g, "$1").trim();
    console.log("DEBUG: Cleaned JSON text from Gemini:", responseJsonText);

    const parsedResponse = JSON.parse(responseJsonText); // This might throw if JSON is still invalid

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("FATAL ERROR in function execution:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Failed to process AI request." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

console.log("DEBUG: rpg-ai-engine function setup complete. Ready to serve.");
