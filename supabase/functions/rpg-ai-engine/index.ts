// supabase/functions/rpg-ai-engine/index.ts - Phase 1 Backend Improvements
import { serve } from "std/http/server.ts"; //

console.log("DEBUG: rpg-ai-engine function starting (Phase 1 Improvements)...");

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
// const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_MODEL_NAME = "gemini-2.0-flash-lite"; //
// const GEMINI_MODEL_NAME = "gemini-1.5-pro-latest";

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GOOGLE_AI_API_KEY}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://injoque.dev", //
  "Access-Control-Allow-Methods": "POST, OPTIONS", //
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey", //
};

serve(async (req: Request) => {
  console.log(`DEBUG: Received invocation: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    console.log("DEBUG: Handling OPTIONS request, sending 200 OK with CORS headers.");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    console.warn(`WARN: Method ${req.method} not allowed. Only POST and OPTIONS are handled.`);
    return new Response(JSON.stringify({ error: "Method Not Allowed. Please use POST." }), {
      status: 405,
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

  let body;
  try {
    body = await req.json();
    console.log("DEBUG: Parsed request body:", body);
  } catch (parseError) {
    console.error("ERROR: Invalid JSON in request body.", parseError);
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const {
      currentGameState,
      playerCommand,
      turnHistory,
      gameTheme
    } = body;

    // --- Strengthened Payload Validation ---
    if (!currentGameState || typeof currentGameState !== 'object') {
        throw new Error("Invalid request: currentGameState is missing or not an object.");
    }
    if (typeof currentGameState.playerName !== 'string' ||
        !Array.isArray(currentGameState.inventory) ||
        typeof currentGameState.sectorStability !== 'number' ||
        typeof currentGameState.aiSync !== 'number' ||
        typeof currentGameState.currentLocationDescription !== 'string') {
        console.error("ERROR: Invalid currentGameState structure.", currentGameState);
        throw new Error("Invalid request: currentGameState has missing or invalid fields.");
    }
    if (typeof playerCommand !== 'string') { // typeof undefined is 'undefined', so this catches missing too
        throw new Error("Invalid request: playerCommand is missing or not a string.");
    }
    if (!Array.isArray(turnHistory)) {
        throw new Error("Invalid request: turnHistory is missing or not an array.");
    }
    if (typeof gameTheme !== 'string') {
        throw new Error("Invalid request: gameTheme is missing or not a string.");
    }
    // --- End Validation ---
    
    const geminiHistory = turnHistory.map(turn => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }]
    }));

    const systemInstruction = `You are GAIA Prime, an AI game master for a text-based RPG called Eco-Echoes.
Themes: ${gameTheme}. Player is "${currentGameState.playerName}".
Current Situation: ${currentGameState.currentLocationDescription || 'Just starting.'}
Player Stats: Inventory: ${currentGameState.inventory.length > 0 ? currentGameState.inventory.join(', ') : 'empty'}, Sector Stability: ${currentGameState.sectorStability}%, AI Sync: ${currentGameState.aiSync}%
Player Command: "${playerCommand}"

Task: Generate the next story segment.
Response MUST be a VALID JSON object with the following structure:
{
  "storyText": "Narrative of what happens. Be descriptive and thematic. Keep it to 2-4 sentences unless more is truly needed for a scene.",
  "choices": ["Actionable choice 1", "Actionable choice 2", "Actionable choice 3 (optional)"],
  "itemsFound": ["new_item_1 (if any)"],
  "statusUpdates": [{"statusName": "sectorStability", "newValue": ${currentGameState.sectorStability - 5}, "reason": "Brief reason (optional)"}],
  "newLocationDescription": "Brief updated location summary ONLY if the location or its immediate state changes significantly."
}
Rules:
- storyText: Mandatory, engaging, and descriptive.
- choices: Array of 2-4 short, actionable string choices for the player. If no specific actions are obvious, provide general exploratory choices.
- itemsFound: Array of strings representing item names. MUST be an array, e.g., [] if no items are found.
- statusUpdates: Array of objects. Each object needs "statusName" (string) and "newValue" (number). "reason" (string) is optional. MUST be an array, e.g., [] if no status changes.
- newLocationDescription: String. Only provide if substantially different from previous. Otherwise, can be omitted or null.
- Maintain thematic consistency with AI ethics and environmental sustainability.
- Output ONLY the valid JSON object. No other text, no markdown, no apologies or explanations.
`;
//

    const requestBodyForGemini = {
      contents: [
        ...geminiHistory,
        { role: "user", parts: [{text: systemInstruction}] },
      ],
      generationConfig: {
        temperature: 0.75, 
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, 
        // responseMimeType: "application/json", // Keep commented unless sure about model support
      },
       safetySettings: [ 
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ] //
    };
    console.log("DEBUG: Sending to Gemini API URL:", GEMINI_API_URL);


    const aiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBodyForGemini),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`ERROR: Gemini API request failed: ${aiResponse.status} ${aiResponse.statusText}`, errorText);
      throw new Error(`Gemini API request failed: ${aiResponse.status} - ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    // console.log("DEBUG: Raw Gemini Result:", JSON.stringify(aiResult, null, 2)); // Keep for debugging if needed

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
    
    responseJsonText = responseJsonText.replace(/^```json\s*([\s\S]*?)\s*```$/g, "$1").trim(); //
    console.log("DEBUG: Cleaned JSON text from Gemini:", responseJsonText);

    let parsedResponse;
    try {
        parsedResponse = JSON.parse(responseJsonText);
    } catch (jsonParseError) {
        console.error("ERROR: Failed to parse JSON response from Gemini. Raw text:", responseJsonText, "Error:", jsonParseError);
        throw new Error("AI response was not valid JSON. Please try again.");
    }


    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("FATAL ERROR in function execution:", error.message, error.stack);
    // Ensure the error message sent to the client is somewhat generic but useful
    const clientErrorMessage = error.message.startsWith("Invalid request:") || error.message.startsWith("AI response") 
                               ? error.message 
                               : "Failed to process AI request due to an internal error.";
    return new Response(JSON.stringify({ error: clientErrorMessage, details: error.message }), { // Keep details for client-side logging if needed
      status: error.message.startsWith("Invalid request:") ? 400 : 500, // Use 400 for bad client payload
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

console.log("DEBUG: rpg-ai-engine function setup complete. Ready to serve.");
