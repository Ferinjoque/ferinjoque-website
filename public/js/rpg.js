// public/js/rpg.js - Phase 1 Improvements

// --- Constants ---
const TYPING_SPEED = 5; // Faster for AI output
const MAX_HISTORY_TURNS = 5; // Number of recent player/AI turns to send as context
const COMMAND_HISTORY_MAX = 20; // Max number of commands to keep in history
const SUPABASE_FUNCTION_URL = `https://sueybbrfwiqviollreiu.supabase.co/functions/v1/rpg-ai-engine/`; //

const commandAliases = {
    "l": "look around",
    "i": "inventory",
    "inv": "inventory",
    "h": "help",
    "?": "help",
    "q": "quit" // Example for a future quit command
};

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');
const inventoryDisplay = document.getElementById('inventory-items');
const helpModal = document.getElementById('help-modal');
const helpContent = document.getElementById('help-modal-content');
const closeHelpButton = document.getElementById('close-help-modal');
const aiChoicesPanel = document.getElementById('ai-choices-panel');
const aiLoadingIndicator = document.getElementById('ai-loading-indicator');
let processingMessageElement = null; // To hold the "GAIA Prime is processing..." message element

// --- Game State ---
let gameState = {
    playerName: "Warden",
    inventory: [],
    sectorStability: 100,
    aiSync: 100,
    currentLocationDescription: "at the GAIA Prime main console.",
    turnHistory: [],
    isAwaitingAI: false,
};

// --- Command History ---
let commandHistory = [];
let historyIndex = -1;


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
    const commandableKeywordRegex = /\b(look|examine|use|take|go|inventory|help|status|search|talk|ask|open|north|south|east|west|up|down|console|alert|datapad|keycard|terminal|report|engine|anomaly|power|system|filter|recycle|waste|energy|flora|fauna|reactor|ai core|warden|gaia|terra-3)\b(?![^<]*>|[^<>]*<\/span>)/gi; //
    return htmlLine.replace(commandableKeywordRegex, (match) => `<span class="commandable-keyword">${match}</span>`);
}


async function typeText(text, isCommandEcho = false, type = 'normal') {
    const p = document.createElement('p');
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');
    if (type === 'error-message') p.classList.add('error-message'); // Added for styling errors

    storyOutput.appendChild(p);

    let processedText = escapeHtml(text);
    if (!isCommandEcho && type === 'normal') {
        processedText = highlightKeywordsInHtml(processedText);
    }
    
    p.innerHTML = ''; 

    for (let i = 0; i < processedText.length; i++) {
        if (processedText[i] === '<') { 
            const tagEnd = processedText.indexOf('>', i);
            if (tagEnd !== -1) {
                p.innerHTML += processedText.substring(i, tagEnd + 1);
                i = tagEnd;
            } else {
                p.innerHTML += processedText[i]; 
            }
        } else {
            p.innerHTML += processedText[i];
        }
        storyOutput.scrollTop = storyOutput.scrollHeight;
        if (TYPING_SPEED > 0 && !isCommandEcho && type !== 'system-message' && type !== 'error-message') { // No typing delay for system/error for speed
            await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
        }
    }
    p.innerHTML = processedText; 
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
                li.textContent = escapeHtml(item.name || item);
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
                playerInput.value = choiceText; 
                submitCommandButton.click();    
                aiChoicesPanel.innerHTML = '';  
            });
            aiChoicesPanel.appendChild(button);
        });
    }
}

// New function to show/hide the "GAIA Prime is processing..." message
function showProcessingMessage(show) {
    if (show) {
        if (!processingMessageElement) {
            processingMessageElement = document.createElement('p');
            processingMessageElement.classList.add('system-message', 'processing-indicator-text'); // Added a specific class for targeting
            processingMessageElement.textContent = "GAIA Prime is processing your command...";
            // Insert it before the loading indicator, or as the first child of storyOutput if indicator is elsewhere
            if(aiLoadingIndicator && aiLoadingIndicator.parentNode === storyOutput) {
                storyOutput.insertBefore(processingMessageElement, aiLoadingIndicator);
            } else {
                 storyOutput.appendChild(processingMessageElement);
            }
        }
        processingMessageElement.style.display = 'block';
        if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'flex'; //
        storyOutput.scrollTop = storyOutput.scrollHeight;
    } else {
        if (processingMessageElement) {
            processingMessageElement.style.display = 'none'; // Hide it instead of removing, to reuse
        }
        if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'none'; //
    }
}


async function callAIEngine(playerCommand) {
    if (gameState.isAwaitingAI) {
        console.warn("AI call already in progress.");
        return;
    }
    gameState.isAwaitingAI = true;
    showProcessingMessage(true);
    aiChoicesPanel.innerHTML = ''; 

    const promptPayload = {
        currentGameState: {
            playerName: gameState.playerName,
            inventory: gameState.inventory.map(item => (typeof item === 'string' ? item : item.name)),
            sectorStability: gameState.sectorStability,
            aiSync: gameState.aiSync,
            currentLocationDescription: gameState.currentLocationDescription,
        },
        playerCommand: playerCommand, // Already processed (lowercase, alias expanded)
        turnHistory: gameState.turnHistory, 
        gameTheme: "The game explores AI ethics and environmental sustainability in a sci-fi setting. The player is a Warden interacting with GAIA Prime, the planetary AI. Focus on descriptive text, player agency, and thematic challenges related to ecological balance or AI decisions." //
    };

    try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(promptPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "AI engine request failed with status: " + response.status, details: `Status: ${response.status}` }));
            // Throw an object for richer error info
            throw { message: errorData.error || `HTTP error ${response.status}`, details: errorData.details || `Response not OK from AI Engine.`};
        }

        const aiResponse = await response.json();
        console.log("AI Response:", aiResponse);

        gameState.turnHistory.push({ role: "user", content: playerCommand });
        if (aiResponse.storyText) {
            gameState.turnHistory.push({ role: "assistant", content: aiResponse.storyText.substring(0, 200) }); 
        }
        if (gameState.turnHistory.length > MAX_HISTORY_TURNS * 2) { 
            gameState.turnHistory = gameState.turnHistory.slice(-MAX_HISTORY_TURNS * 2);
        }


        if (aiResponse.storyText) {
            await typeText(aiResponse.storyText);
            // Consider if AI should explicitly state location changes or if it's implicit.
            // For now, keeping this simple substring update:
            gameState.currentLocationDescription = aiResponse.newLocationDescription || aiResponse.storyText.substring(0, 150) + "..."; 
        } else {
            await typeText("GAIA Prime seems to be pondering...", false, 'system-message');
        }

        if (aiResponse.choices && Array.isArray(aiResponse.choices)) {
            displayAIChoices(aiResponse.choices);
        }

        if (aiResponse.itemsFound && Array.isArray(aiResponse.itemsFound)) {
            aiResponse.itemsFound.forEach(item => {
                const itemName = (typeof item === 'object' && item.name) ? item.name : (typeof item === 'string' ? item : null);
                if (itemName && !gameState.inventory.some(i => i.name === itemName)) {
                    gameState.inventory.push({ name: itemName }); // Store as object
                    typeText(`Item added to inventory: ${escapeHtml(itemName)}`, false, 'system-message');
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
        const errorMessage = error.message || "Error connecting to GAIA Prime. Please try again.";
        const errorDetails = error.details ? `Details: ${escapeHtml(String(error.details))}` : "";
        await typeText(errorMessage, false, 'error-message');
        if(errorDetails) await typeText(errorDetails, false, 'error-message');

    } finally {
        gameState.isAwaitingAI = false;
        showProcessingMessage(false);
        playerInput.focus();
    }
}

async function handlePlayerCommand() {
    const originalCommandText = playerInput.value.trim();
    if (!originalCommandText || gameState.isAwaitingAI) {
        playerInput.focus();
        return;
    }
    
    // Store original command in history before processing
    commandHistory.push(originalCommandText);
    if (commandHistory.length > COMMAND_HISTORY_MAX) {
        commandHistory.shift();
    }
    historyIndex = commandHistory.length; // Reset index to point after the last command

    playerInput.value = ''; // Clear input field immediately

    let processedCommand = originalCommandText.toLowerCase(); // Standardize to lowercase for aliases and internal checks

    if (commandAliases[processedCommand]) {
        processedCommand = commandAliases[processedCommand];
        await typeText(`> ${escapeHtml(originalCommandText)} (${escapeHtml(processedCommand)})`, true); // Echo original and expansion
    } else {
        await typeText(`> ${escapeHtml(originalCommandText)}`, true); // Echo command
    }


    // Special client-side commands (use processedCommand)
    if (processedCommand === "help") {
        showHelpModal();
        playerInput.focus(); // Refocus after modal might take focus
        return;
    }
    if (processedCommand === "inventory") {
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
    if (processedCommand === "status") {
        await typeText(`Current Status: Sector Stability ${gameState.sectorStability}%, AI Sync ${gameState.aiSync}%`, false, 'system-message');
        playerInput.focus();
        return;
    }
    // Example: Add a 'quit' command or other client-side logic here if needed
    // if (processedCommand === "quit") {
    //     await typeText("Quitting Eco-Echoes. Your progress as a guest is not saved.", false, 'system-message');
    //     // Potentially disable input, etc.
    //     playerInput.disabled = true;
    //     submitCommandButton.disabled = true;
    //     return;
    // }

    // Send other commands to AI using the processedCommand
    await callAIEngine(processedCommand);
}

// --- Help Modal ---
function showHelpModal() {
    if (!helpModal || !helpContent) return;
    helpModal.style.display = 'flex';
}

function closeHelpModalFunc() {
    if (helpModal) helpModal.style.display = 'none';
    playerInput.focus();
}

// --- Initialization ---
async function initializeGame() {
    storyOutput.innerHTML = ''; 
    updateStatusDisplay();

    await typeText("Connecting to GAIA Prime...", false, 'system-message');
    await callAIEngine("##START_GAME##"); 

    // Event Listeners
    if (submitCommandButton) {
        submitCommandButton.addEventListener('click', handlePlayerCommand);
    }
    if (playerInput) {
        // Changed to keydown to handle arrow keys properly
        playerInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission if it were in a form
                handlePlayerCommand();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (commandHistory.length > 0 && historyIndex > 0) {
                    historyIndex--;
                    playerInput.value = commandHistory[historyIndex];
                    playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    playerInput.value = commandHistory[historyIndex];
                    playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                } else if (historyIndex === commandHistory.length - 1) {
                     historyIndex++; // Move "past" the last item
                     playerInput.value = ""; // Clear if at the end of history and pressing down again
                }
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
    console.log("Eco-Echoes AI RPG Initialized (Phase 1 Improvements).");
    playerInput.focus();
}

// Start
initializeGame();
