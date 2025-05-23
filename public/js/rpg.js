// public/js/rpg.js - AI DRIVEN REWRITE

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');
const inventoryDisplay = document.getElementById('inventory-items');
const helpModal = document.getElementById('help-modal');
const helpContent = document.getElementById('help-modal-content'); // For dynamic help content
const closeHelpButton = document.getElementById('close-help-modal');
const aiChoicesPanel = document.getElementById('ai-choices-panel');
const aiLoadingIndicator = document.getElementById('ai-loading-indicator');

// --- Game State ---
let gameState = {
    playerName: "Warden",
    inventory: [],
    sectorStability: 100, // Example status
    aiSync: 100,          // Example status
    currentLocationDescription: "at the GAIA Prime main console.", // Initial brief description
    turnHistory: [],      // To provide context to the AI
    maxHistoryTurns: 5,   // Number of recent player/AI turns to send as context
    isAwaitingAI: false,  // Flag to prevent multiple submissions
};

// --- Configuration ---
const TYPING_SPEED = 5; // Faster for AI output
const SUPABASE_FUNCTION_URL = `/functions/v1/rpg-ai-engine`; // Relative path for Supabase Edge Function

// --- Core Functions ---

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function highlightKeywordsInHtml(htmlLine) {
    // More robust keyword highlighting that attempts to avoid messing with HTML tags
    // This is a simplified version; a more complex parser might be needed for perfect results.
    const commandableKeywordRegex = /\b(look|examine|use|take|go|inventory|help|status|search|talk|ask|open|north|south|east|west|up|down|console|alert|datapad|keycard|terminal|report|engine|anomaly|power|system|filter|recycle|waste|energy|flora|fauna|reactor|ai core|warden|gaia|terra-3)\b(?![^<]*>|[^<>]*<\/span>)/gi;
    return htmlLine.replace(commandableKeywordRegex, (match) => `<span class="commandable-keyword">${match}</span>`);
}


async function typeText(text, isCommandEcho = false, type = 'normal') {
    const p = document.createElement('p');
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');

    storyOutput.appendChild(p);

    // Sanitize and then highlight keywords for non-command echo, non-system messages
    let processedText = escapeHtml(text); // Basic sanitization
    if (!isCommandEcho && type === 'normal') {
        processedText = highlightKeywordsInHtml(processedText); // Highlight after sanitizing
    }
    
    p.innerHTML = ''; // Start with empty for typing effect

    for (let i = 0; i < processedText.length; i++) {
        if (processedText[i] === '<') { // Handle HTML tags by adding them wholesale
            const tagEnd = processedText.indexOf('>', i);
            if (tagEnd !== -1) {
                p.innerHTML += processedText.substring(i, tagEnd + 1);
                i = tagEnd;
            } else {
                p.innerHTML += processedText[i]; // Fallback for broken tag
            }
        } else {
            p.innerHTML += processedText[i];
        }
        storyOutput.scrollTop = storyOutput.scrollHeight;
        if (TYPING_SPEED > 0 && !isCommandEcho) {
            await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
        }
    }
     p.innerHTML = processedText; // Ensure full content is set
    storyOutput.scrollTop = storyOutput.scrollHeight;
}

function updateStatusDisplay() {
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;

    if (inventoryDisplay) {
        inventoryDisplay.innerHTML = '';
        if (gameState.inventory.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'Empty';
            p.classList.add('inventory-empty-message');
            inventoryDisplay.appendChild(p);
        } else {
            const ul = document.createElement('ul');
            ul.classList.add('inventory-list');
            gameState.inventory.forEach(item => {
                const li = document.createElement('li');
                li.textContent = escapeHtml(item.name || item); // item might be string or {name: "..."}
                li.classList.add('inventory-item');
                ul.appendChild(li);
            });
            inventoryDisplay.appendChild(ul);
        }
    }
}

function displayAIChoices(choices) {
    aiChoicesPanel.innerHTML = '';
    if (choices && choices.length > 0) {
        choices.forEach(choiceText => {
            if (typeof choiceText !== 'string' || choiceText.trim() === '') return;
            const button = document.createElement('button');
            button.classList.add('ai-choice-button');
            button.textContent = escapeHtml(choiceText);
            button.addEventListener('click', () => {
                if (gameState.isAwaitingAI) return;
                playerInput.value = choiceText; // Put choice into input
                submitCommandButton.click();    // Simulate clicking send
                aiChoicesPanel.innerHTML = '';  // Clear choices after one is clicked
            });
            aiChoicesPanel.appendChild(button);
        });
    }
}

async function callAIEngine(playerCommand) {
    if (gameState.isAwaitingAI) {
        console.warn("AI call already in progress.");
        return;
    }
    gameState.isAwaitingAI = true;
    if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'flex';
    aiChoicesPanel.innerHTML = ''; // Clear old choices

    const promptPayload = {
        currentGameState: {
            playerName: gameState.playerName,
            inventory: gameState.inventory.map(item => (typeof item === 'string' ? item : item.name)), // Send only names
            sectorStability: gameState.sectorStability,
            aiSync: gameState.aiSync,
            currentLocationDescription: gameState.currentLocationDescription,
        },
        playerCommand: playerCommand,
        turnHistory: gameState.turnHistory, // Send recent history
        gameTheme: "The game explores AI ethics and environmental sustainability in a sci-fi setting. The player is a Warden interacting with GAIA Prime, the planetary AI. Focus on descriptive text, player agency, and thematic challenges related to ecological balance or AI decisions."
    };

    try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization header if your Supabase function requires it (e.g., user JWT)
                // 'Authorization': `Bearer ${yourSupabaseUserJwt}`
            },
            body: JSON.stringify(promptPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "AI engine request failed with status: " + response.status }));
            throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const aiResponse = await response.json();
        console.log("AI Response:", aiResponse);

        // Add current exchange to history (player command and AI story text)
        gameState.turnHistory.push({ role: "user", content: playerCommand });
        if (aiResponse.storyText) {
            gameState.turnHistory.push({ role: "assistant", content: aiResponse.storyText.substring(0, 200) }); // Store a summary
        }
        if (gameState.turnHistory.length > gameState.maxHistoryTurns * 2) { // *2 for user/assistant pairs
            gameState.turnHistory = gameState.turnHistory.slice(-gameState.maxHistoryTurns * 2);
        }


        if (aiResponse.storyText) {
            await typeText(aiResponse.storyText);
            gameState.currentLocationDescription = aiResponse.storyText.substring(0, 150) + "..."; // Update location based on AI
        } else {
            await typeText("GAIA Prime seems to be pondering...", false, 'system-message');
        }

        if (aiResponse.choices && Array.isArray(aiResponse.choices)) {
            displayAIChoices(aiResponse.choices);
        }

        if (aiResponse.itemsFound && Array.isArray(aiResponse.itemsFound)) {
            aiResponse.itemsFound.forEach(item => {
                if (typeof item === 'string' && !gameState.inventory.some(i => (typeof i === 'string' ? i : i.name) === item)) {
                    gameState.inventory.push({ name: item }); // Store as object for consistency
                    typeText(`Item added to inventory: ${escapeHtml(item)}`, false, 'system-message');
                }
            });
        }

        if (aiResponse.statusUpdates && Array.isArray(aiResponse.statusUpdates)) {
            aiResponse.statusUpdates.forEach(update => {
                if (update && typeof update.statusName === 'string' && typeof update.newValue !== 'undefined') {
                    if (gameState.hasOwnProperty(update.statusName)) {
                        gameState[update.statusName] = update.newValue;
                        typeText(`Status updated: ${escapeHtml(update.statusName)} is now ${escapeHtml(String(update.newValue))}${update.reason ? ` (${escapeHtml(update.reason)})` : ''}.`, false, 'system-message');
                    }
                }
            });
        }
        updateStatusDisplay();

    } catch (error) {
        console.error("Error calling AI Engine:", error);
        await typeText(`Error connecting to GAIA Prime: ${escapeHtml(error.message)}. Please try again.`, false, 'system-message');
    } finally {
        gameState.isAwaitingAI = false;
        if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'none';
        playerInput.focus();
    }
}

async function handlePlayerCommand() {
    const command = playerInput.value.trim();
    if (!command || gameState.isAwaitingAI) {
        playerInput.focus();
        return;
    }

    playerInput.value = ''; // Clear input
    await typeText(`> ${escapeHtml(command)}`, true); // Echo command

    // Special client-side commands
    if (command.toLowerCase() === "help" || command === "?") {
        showHelpModal();
        return;
    }
    if (command.toLowerCase() === "inventory" || command.toLowerCase() === "i") {
        if (gameState.inventory.length === 0) {
            await typeText("Your inventory is empty.", false, 'system-message');
        } else {
            await typeText("You are carrying:", false, 'system-message');
            for (const item of gameState.inventory) {
                await typeText(`- ${escapeHtml(item.name || item)}`, false, 'system-message');
            }
        }
        playerInput.focus();
        return;
    }
     if (command.toLowerCase() === "status") {
        await typeText(`Current Status: Sector Stability ${gameState.sectorStability}%, AI Sync ${gameState.aiSync}%`, false, 'system-message');
        playerInput.focus();
        return;
    }

    // Send other commands to AI
    await callAIEngine(command);
}

// --- Help Modal ---
function showHelpModal() {
    if (!helpModal || !helpContent) return;
    // Help content is now mostly static in HTML, but you could update it dynamically if needed.
    helpModal.style.display = 'flex';
}

function closeHelpModalFunc() {
    if (helpModal) helpModal.style.display = 'none';
    playerInput.focus();
}

// --- Initialization ---
async function initializeGame() {
    storyOutput.innerHTML = ''; // Clear initial "Initializing..."
    updateStatusDisplay();

    // Initial "Greeting" from AI
    await typeText("Connecting to GAIA Prime...", false, 'system-message');
    await callAIEngine("##START_GAME##"); // Special command for AI to provide intro

    // Event Listeners
    if (submitCommandButton) {
        submitCommandButton.addEventListener('click', handlePlayerCommand);
    }
    if (playerInput) {
        playerInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handlePlayerCommand();
            }
        });
    }
    if (closeHelpButton) {
        closeHelpButton.addEventListener('click', closeHelpModalFunc);
    }
    if (helpModal) {
        helpModal.addEventListener('click', (event) => {
            if (event.target === helpModal) closeHelpModalFunc();
        });
    }
    document.querySelectorAll('.initial-load-fade').forEach(el => el.classList.remove('initial-load-fade'));
    console.log("Eco-Echoes AI RPG Initialized.");
    playerInput.focus();
}

// Start
initializeGame();
