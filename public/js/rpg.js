// public/js/rpg.js

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const choicesOutput = document.getElementById('choices-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');
// --- New DOM Element for Inventory ---
const inventoryDisplay = document.getElementById('inventory-items'); // We'll add this ID in rpg.html

// --- Game State ---
let gameState = {
    playerName: "Warden",
    currentScene: "intro",
    inventory: [], // Will store objects like { id: "data_chip", name: "Data Chip" }
    sectorStability: 100,
    aiSync: 100,
    isTyping: false,
};

// --- Typing Speed & Delays ---
const TYPING_SPEED = 15;
const CHOICE_FADE_IN_DELAY_INCREMENT = 100;

// --- Story Data (con ejemplos de cómo dar y requerir objetos) ---
const story = {
    intro: {
        text: [
            "Initializing GAIA Prime interface...",
            "Welcome, Warden <span class='accent'>{playerName}</span>.",
            "System assessment: Critical environmental anomaly detected in Sector Gamma-7. Your guidance is required."
        ],
        choices: [
            { text: "Review anomaly details.", nextScene: "anomaly_details" },
            { text: "Check system status.", nextScene: "system_status" },
            { text: "Search the console for any useful tools.", nextScene: "search_console" } // New choice
        ],
        onEnter: () => updateStatusDisplay()
    },
    search_console: {
        text: ["You search an auxiliary port on the console... and find a forgotten <span class='accent'>Diagnostic Keycard</span>."],
        onEnter: () => {
            addItemToInventory("diag_keycard", "Diagnostic Keycard");
            updateStatusDisplay(); // Update all status, including new inventory
        },
        choices: [
            { text: "Continue.", nextScene: "intro" } // Go back to main intro choices for now
        ]
    },
    anomaly_details: {
        text: [
            "Anomaly data stream incoming: Unidentified bio-signature fluctuations and energy spikes originating from the old Terraforming Unit 7.",
            "Local AI Custodian, unit 'Terra-3', reports unusual organic growth patterns."
        ],
        choices: [
            { text: "Query Terra-3 for a visual.", nextScene: "terra_3_visual" },
            { text: "Analyze energy spike signature.", nextScene: "energy_analysis" },
            { text: "Access advanced diagnostics (Requires Diagnostic Keycard).", nextScene: "advanced_diagnostics", condition: () => playerHasItem("diag_keycard") },
            { text: "Proceed to Sector Gamma-7 immediately.", nextScene: "gamma_7_arrival" }
        ]
    },
    advanced_diagnostics: {
        text: ["You insert the Diagnostic Keycard. Accessing deep system logs...", "The anomaly correlates with a power surge from an unauthorized geothermal tap. The bio-signatures are... adapting to it."],
        onEnter: () => {
            // Example: Using an item could consume it, or have other effects
            // removeItemFromInventory("diag_keycard"); // If it's a one-time use
        },
        choices: [
            { text: "Investigate geothermal tap.", nextScene: "geothermal_investigation" },
            { text: "Focus on the adapting bio-signatures.", nextScene: "biosignature_focus" }
        ]
    },
    // ... (resto de tus escenas existentes como system_status, terra_3_visual, etc.) ...
    // Añade más escenas aquí para las nuevas opciones
    geothermal_investigation: {
        text: ["Tracing the geothermal tap leads you to a hidden sublevel beneath Terraforming Unit 7. The heat is intense."],
        choices: [{text: "Proceed with caution.", nextScene: "default_end"}]
    },
    biosignature_focus: {
        text: ["The adapting bio-signatures are forming a symbiotic network around the energy source. It's a novel ecosystem, but unstable."],
        choices: [{text: "Attempt to stabilize.", nextScene: "default_end"}]
    },
    system_status: {
        text: [
            "GAIA Prime Core: Optimal. Sector Stability: {sectorStability}%. AI Synchronization: {aiSync}%.",
            "No other critical alerts at this time."
        ],
        choices: [ { text: "Back to anomaly.", nextScene: "anomaly_details" } ]
    },
    terra_3_visual: {
        text: ["Terra-3's visual feed shows dense, rapidly pulsing flora enveloping the old unit. It's unlike anything in the database."],
        choices: [
            {text: "Scan flora composition.", nextScene: "flora_scan"},
            {text: "Return to anomaly overview.", nextScene: "anomaly_details"}
        ]
    },
    energy_analysis: {
        text: ["Energy signature analysis is inconclusive. It matches no known natural or artificial source. High tachyon particle emissions detected."],
        choices: [
            {text: "Cross-reference tachyon emissions with historical data.", nextScene: "tachyon_crossreference"},
            {text: "Return to anomaly overview.", nextScene: "anomaly_details"}
        ]
    },
    gamma_7_arrival: {
        text: ["You've arrived at Sector Gamma-7. The air is thick with an unknown pollen. The ground trembles slightly. What do you do?"],
        commands: {
            "scan area": "scan_gamma_7_area",
            "approach terraforming unit": "approach_unit_gamma_7"
        },
        choices: [
             {text: "Scan the immediate area.", nextScene: "scan_gamma_7_area"},
             {text: "Cautiously approach the Terraforming Unit.", nextScene: "approach_unit_gamma_7"},
             {text: "Stay put and observe.", nextScene: "observe_gamma_7"}
        ]
    },
    flora_scan: {
        text: ["Scanning flora... Composition unknown. Exhibits signs of rapid cellular regeneration and emits a low-frequency hum."],
        choices: [{text: "Back to anomaly details.", nextScene: "anomaly_details"}]
    },
    tachyon_crossreference: {
        text: ["Historical data on similar tachyon emissions is sparse. One match found: a precursor event to the 'Nova Bloom' incident, classified Level 5 biohazard."],
        choices: [{text: "Back to anomaly details.", nextScene: "anomaly_details"}]
    },
     scan_gamma_7_area:{
        text: ["The area is overgrown. Your suit's sensors pick up multiple life signs, small and fast-moving, hidden within the dense flora."],
        choices: [
            {text: "Try to get a closer look at the life signs.", nextScene: "default_end"}, // Placeholder
            {text: "Proceed to the Terraforming Unit.", nextScene: "approach_unit_gamma_7"}
        ]
    },
    approach_unit_gamma_7: {
        text: ["As you get closer to the Terraforming Unit, the humming intensifies. The pulsing flora seems to react to your presence, its light patterns changing."],
        choices: [
            {text: "Interface with the unit directly.", nextScene: "default_end"}, // Placeholder
            {text: "Take a sample of the flora.", nextScene: "default_end"} // Placeholder
        ]
    },
     observe_gamma_7: {
        text: ["You observe from a distance. The flora pulses in a synchronized rhythm. A faint, almost melodic sound can be heard emanating from the Terraforming Unit."],
        choices: [
            {text: "Attempt to record the sound.", nextScene: "default_end"}, // Placeholder
            {text: "Approach the unit.", nextScene: "approach_unit_gamma_7"}
        ]
    },
    default_end: {
        text: ["This path is still under development. The story continues soon..."],
        choices: [{text: "Restart adventure.", nextScene: "intro"}]
    }
};


// --- Inventory Functions ---
function addItemToInventory(itemId, itemName) {
    if (!playerHasItem(itemId)) {
        gameState.inventory.push({ id: itemId, name: itemName });
        // displayText(`System: ${itemName} added to inventory.`, false, 'system-message'); // Optional system message
        updateInventoryDisplay(); // Actualizar la UI del inventario
    }
}

function playerHasItem(itemId) {
    return gameState.inventory.some(item => item.id === itemId);
}

function updateInventoryDisplay() {
    if (!inventoryDisplay) return;
    inventoryDisplay.innerHTML = ''; // Clear old items
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
            li.textContent = item.name;
            li.classList.add('inventory-item');
            li.dataset.itemId = item.id;
            ul.appendChild(li);
        });
        inventoryDisplay.appendChild(ul);
    }
}


// --- Game Logic Functions (typeText, processTextTemplate sin cambios) ---
function processTextTemplate(text) {
    return text.replace(/{playerName}/g, gameState.playerName)
               .replace(/{sectorStability}/g, gameState.sectorStability)
               .replace(/{aiSync}/g, gameState.aiSync);
}

async function typeText(element, textLines) {
    gameState.isTyping = true;
    element.innerHTML = '';

    for (const line of textLines) {
        const processedLine = processTextTemplate(line);
        const p = document.createElement('p');
        p.classList.add('story-text-line');
        element.appendChild(p);
        let currentText = '';
        for (let i = 0; i < processedLine.length; i++) {
            if (processedLine[i] === '<') {
                const tagEnd = processedLine.indexOf('>', i);
                if (tagEnd !== -1) {
                    currentText += processedLine.substring(i, tagEnd + 1);
                    i = tagEnd;
                } else { currentText += processedLine[i]; }
            } else { currentText += processedLine[i]; }
            p.innerHTML = currentText;
            element.scrollTop = element.scrollHeight;
            if (processedLine[i] !== '>' || (i > 0 && processedLine[i-1] ==='<')) { // No delay after closing a tag, or if inside a tag
                 await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
            }
        }
        p.innerHTML = processedLine;
        element.scrollTop = element.scrollHeight;
    }
    gameState.isTyping = false;
}

async function renderScene(sceneId) {
    if (gameState.isTyping && sceneId !== gameState.currentScene) {
        return;
    }

    const scene = story[sceneId] || story['default_end'];
    if (!scene) {
        console.error(`Scene not found: ${sceneId}`);
        await typeText(storyOutput, ["Error: Story progression lost. Please contact support."]);
        choicesOutput.innerHTML = '';
        return;
    }
    gameState.currentScene = sceneId;

    choicesOutput.innerHTML = '';
    choicesOutput.classList.remove('visible');

    let textToDisplay = [];
    if (scene.text) {
        textToDisplay = Array.isArray(scene.text) ? scene.text : [scene.text];
    }
    await typeText(storyOutput, textToDisplay);

    if (scene.choices && scene.choices.length > 0) {
        let visibleChoices = 0;
        scene.choices.forEach((choice, index) => {
            // --- Check condition for displaying choice ---
            if (choice.condition && !choice.condition()) {
                return; // Skip this choice
            }

            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = processTextTemplate(choice.text);
            button.addEventListener('click', () => {
                if (gameState.isTyping) return;

                // --- Handle adding item from choice ---
                if (choice.addItem) {
                    addItemToInventory(choice.addItem.id, choice.addItem.name);
                }
                // --- Handle effects on stats from choice (ejemplo) ---
                if (choice.effects) {
                    if (choice.effects.sectorStability) gameState.sectorStability += choice.effects.sectorStability;
                    if (choice.effects.aiSync) gameState.aiSync += choice.effects.aiSync;
                    // Clamp stats if needed:
                    // gameState.sectorStability = Math.max(0, Math.min(100, gameState.sectorStability));
                    // gameState.aiSync = Math.max(0, Math.min(100, gameState.aiSync));
                    updateStatusDisplay(); // Update display after effects
                }

                renderScene(choice.nextScene);
            });
            choicesOutput.appendChild(button);
            setTimeout(() => {
                 button.classList.add('choice-visible');
            }, visibleChoices * CHOICE_FADE_IN_DELAY_INCREMENT); // Use visibleChoices for delay
            visibleChoices++;
        });
        if (visibleChoices > 0) {
            choicesOutput.classList.add('visible');
        }


        if (playerInput) playerInput.style.display = 'none';
        if (submitCommandButton) submitCommandButton.style.display = 'none';
    } else {
        if (playerInput) playerInput.style.display = 'block';
        if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
        if (playerInput && document.activeElement !== playerInput) {
           setTimeout(() => playerInput.focus(), 0);
        }
    }
    
    // --- Call onEnter AFTER text typing and choices are set up ---
    if (typeof scene.onEnter === 'function') {
        scene.onEnter(); // This might call addItemToInventory, so inventory updates after
    }
    updateInventoryDisplay(); // Ensure inventory is up-to-date after onEnter might add items
}

// displayText (para eco de comandos y mensajes de sistema)
function displayText(textLine, isCommandEcho = false, type = 'normal') {
    const p = document.createElement('p');
    p.innerHTML = processTextTemplate(textLine); // processTextTemplate for consistency
    p.classList.add('story-text-line');
    if (isCommandEcho) {
        p.classList.add('command-echo');
    }
    if (type === 'system-message') {
        p.classList.add('system-message'); // For special styling of system messages
    }
    storyOutput.appendChild(p);
    storyOutput.scrollTop = storyOutput.scrollHeight;
}


async function handlePlayerCommand(command) {
    if (gameState.isTyping) return;

    const lowerCommand = command.toLowerCase().trim();
    displayText(`> ${command}`, true);

    let sceneChangedByCommand = false;
    let nextSceneId = gameState.currentScene;
    let commandHandled = false;

    // --- Inventory Command ---
    if (lowerCommand === "inventory" || lowerCommand === "i") {
        let inventoryTextLines = [];
        if (gameState.inventory.length === 0) {
            inventoryTextLines.push("Your inventory is empty.");
        } else {
            inventoryTextLines.push("You are carrying:");
            gameState.inventory.forEach((item) => {
                inventoryTextLines.push(`- ${item.name}`);
            });
        }
        // Append to current story output (or decide if it should replace)
        for (const line of inventoryTextLines) {
            displayText(line, false, 'system-message');
        }
        commandHandled = true;
    }
    // --- Use Item Command (Basic Example) ---
    else if (lowerCommand.startsWith("use ")) {
        const itemNameOrId = lowerCommand.substring(4).trim();
        const itemToUse = gameState.inventory.find(item => item.name.toLowerCase().includes(itemNameOrId) || item.id.toLowerCase().includes(itemNameOrId));

        if (itemToUse) {
            const currentSceneDef = story[gameState.currentScene];
            if (currentSceneDef.itemUses && currentSceneDef.itemUses[itemToUse.id]) {
                const useAction = currentSceneDef.itemUses[itemToUse.id];
                displayText(`You use the ${itemToUse.name}...`, false, 'system-message');
                if (useAction.textResult) {
                     displayText(useAction.textResult, false, 'system-message');
                }
                if (useAction.effects) { /* Apply effects */ }
                if (useAction.removeItem) { /* Remove item */ }
                if (useAction.nextScene) {
                    nextSceneId = useAction.nextScene;
                    sceneChangedByCommand = true;
                }
                // Potentially add more complex logic or function calls here
            } else {
                displayText(`You can't find a way to use the ${itemToUse.name} here.`, false, 'system-message');
            }
        } else {
            displayText("You don't have that item.", false, 'system-message');
        }
        commandHandled = true;
    }
    // --- Existing Command Parsing (if any defined in scene) ---
    else if (story[gameState.currentScene] && story[gameState.currentScene].commands) {
        const commandHandler = story[gameState.currentScene].commands[lowerCommand];
        if (commandHandler) {
            if (typeof commandHandler === 'string') {
                nextSceneId = commandHandler;
                sceneChangedByCommand = true;
            } else if (typeof commandHandler === 'function') {
                const resultScene = commandHandler();
                if (resultScene && typeof resultScene === 'string') nextSceneId = resultScene;
                else nextSceneId = gameState.currentScene; // Assume function might modify gameState.currentScene
                sceneChangedByCommand = true;
            }
            commandHandled = true;
        }
    }
    
    if (sceneChangedByCommand) {
        await renderScene(nextSceneId);
    } else if (!commandHandled) { // If no specific command was handled, give default responses
        let responseTextArray = [];
        if (lowerCommand === "help") {
            responseTextArray = ["Available commands: 'inventory' (or 'i'), 'use [item name]'. Other actions may be contextual."];
        } else {
            responseTextArray = ["Command not understood or not applicable here."];
        }
        for (const line of responseTextArray) {
            displayText(line, false, 'system-message');
        }
    }
    
    // Ensure input field is ready again if applicable for the current/new scene
    const finalSceneDef = story[nextSceneId] || story[gameState.currentScene];
    if (!finalSceneDef?.choices?.length > 0 && playerInput) {
        playerInput.style.display = 'block';
        if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
        setTimeout(() => playerInput.focus(), 0);
    }
}


function updateStatusDisplay() {
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;
    updateInventoryDisplay(); // Call this here to keep inventory display fresh
}

// --- Event Listeners ---
if (submitCommandButton) {
    submitCommandButton.addEventListener('click', async () => {
        if (gameState.isTyping) return;
        const command = playerInput.value;
        if (command) {
            playerInput.value = '';
            await handlePlayerCommand(command);
        }
    });
}

if (playerInput) {
    playerInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            if (gameState.isTyping) return;
            const command = playerInput.value;
            if (command) {
                playerInput.value = '';
                await handlePlayerCommand(command);
            }
        }
    });
}

const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        alert('Theme toggle clicked! Implement theme switching logic here.');
    });
}

// --- Initial Game Setup ---
async function initializeGame() {
    const elementsToFade = [
        storyOutput,
        choicesOutput,
        document.getElementById('status-panel') // This now includes the inventory parent
    ];
    if (playerInput && playerInput.parentElement) {
        elementsToFade.push(playerInput.parentElement);
    }

    elementsToFade.forEach(el => {
        if(el) el.classList.add('initial-load-fade');
    });
    
    updateStatusDisplay(); // Initial call to set up status, including empty inventory
    await renderScene(gameState.currentScene);

    setTimeout(() => {
        elementsToFade.forEach(el => {
            if(el) el.classList.remove('initial-load-fade');
        });
    }, 600);
}

// Start the game
initializeGame();
