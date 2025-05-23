// supabase/functions/rpg-ai-engine/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Ensure you use a version of std compatible with your Deno/Supabase env

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

// --- CHANGE THIS LINE ---
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`;
// --- END CHANGE ---

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Or your specific frontend URL for better security
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!GOOGLE_AI_API_KEY) {
    console.error("Google AI API Key not set in Supabase secrets.");
    return new Response(JSON.stringify({ error: "Server configuration error: Missing AI API Key." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const {
      currentGameState,
      playerCommand,
      turnHistory, // Array of {role: "user"|"model", content: "..."}
      gameTheme
    } = await req.json();

    // Construct the history for Gemini
    const geminiHistory = turnHistory.map(turn => ({
      role: turn.role === "user" ? "user" : "model", // Gemini uses "user" and "model"
      parts: [{ text: turn.content }]
    }));

    const systemInstruction = `You are GAIA Prime, an AI game master for a text-based RPG called Eco-Echoes.
The game explores themes of AI ethics and environmental sustainability in a sci-fi setting.
The player is a "Warden" interacting with you.
Your role is to describe the environment, character interactions, and outcomes of player actions.
The game world is a post-environmental-mishap Earth where nature and technology are in a fragile balance.
Focus on descriptive text and player agency.
The player's current situation: ${currentGameState.currentLocationDescription || 'Just starting out.'}
Player Name: ${currentGameState.playerName}
Inventory: ${currentGameState.inventory.length > 0 ? currentGameState.inventory.join(', ') : 'empty'}
Sector Stability: ${currentGameState.sectorStability}%
AI Core Sync: ${currentGameState.aiSync}%

The player's command is: "${playerCommand}"

Based on this, generate the next part of the story.
Your response MUST be a VALID JSON object with the following structure:
{
  "storyText": "A narrative description of what happens. This should be engaging and thematic. Describe sights, sounds, smells. If an NPC speaks, include their dialogue here.",
  "choices": ["A possible action player can take.", "Another possible action.", "A question player might ask."],
  "itemsFound": ["item_name_1", "item_name_2"],
  "statusUpdates": [
    {"statusName": "sectorStability", "newValue": ${currentGameState.sectorStability - 5}, "reason": "Brief reason for change"},
    {"statusName": "aiSync", "newValue": ${currentGameState.aiSync + 2}}
  ],
  "newLocationDescription": "A brief updated description of the player's current location/situation if it has significantly changed."
}

Important rules for your JSON response:
- "storyText" is mandatory and should be detailed.
- "choices" should be an array of 2-4 short, actionable strings. If no specific choices, provide general ones like "Look around", "Check status".
- "itemsFound" is an array of strings. Only include items the player newly discovers or acquires in this turn. If none, use an empty array [].
- "statusUpdates" is an array of objects. Only include if a status actually changes. Provide the 'statusName' (e.g., 'sectorStability', 'aiSync') and the 'newValue' (absolute new value). 'reason' is optional. If no status change, use an empty array [].
- "newLocationDescription" is a short string summarizing the new state if different from the input.
- If the player command is nonsensical or very vague, try to guide them or describe a default observation.
- Incorporate the game's themes: ${gameTheme}
- Be creative and maintain a consistent narrative tone.
- Do NOT output anything other than the single, valid JSON object.
`;

    const requestBody = {
      contents: [
        ...geminiHistory,
        { role: "user", parts: [{text: systemInstruction}] },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40, // Default for Flash-Lite is 64, but can be adjusted (Source 2.2)
        topP: 0.95,
        maxOutputTokens: 2048, // Max output for Flash-Lite is 8192 (Source 2.2), 2048 is a safe starting point.
        // responseMimeType: "application/json", // Good practice if supported
      },
       safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ]
    };

    const aiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API request failed: ${aiResponse.status} ${errorText}`);
    }

    const aiResult = await aiResponse.json();

    let responseJsonText = "";
    if (aiResult.candidates && aiResult.candidates[0] && aiResult.candidates[0].content && aiResult.candidates[0].content.parts && aiResult.candidates[0].content.parts[0]) {
      responseJsonText = aiResult.candidates[0].content.parts[0].text;
    } else {
      if (aiResult.candidates && aiResult.candidates[0] && aiResult.candidates[0].finishReason === 'SAFETY') {
        console.warn("Gemini response blocked due to safety settings:", aiResult.candidates[0].safetyRatings);
        throw new Error("AI response blocked due to safety settings. Try a different prompt.");
      }
      throw new Error("Unexpected response structure from Gemini API.");
    }
    
    responseJsonText = responseJsonText.replace(/^```json\s*|```$/g, "").trim();
    const parsedResponse = JSON.parse(responseJsonText);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Supabase function:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to process AI request." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
