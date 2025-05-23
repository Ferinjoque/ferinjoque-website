// public/js/rpg.js

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

// --- Game State ---
let gameState = {
    playerName: "Warden",
    currentScene: "intro", // Ensure this is a valid starting scene ID
    inventory: [],
    sectorStability: 100,
    aiSync: 100,
    isTyping: false,
    firstLookInScene: true,
};

// --- Typing Speed ---
const TYPING_SPEED = 15;

// --- Keywords & Story Data (Using your provided structure) ---
const COMMON_KEYWORDS = [
    "look", "examine", "use", "take", "go", "inventory", "help", "status", "search",
    "mirar", "examinar", "usar", "coger", "ir", "inventario", "ayuda", "estado", "buscar",
    "console", "alert", "interface", "port", "keycard", "diagnostic keycard",
    "data stream", "report", "terra-3", "terraforming unit 7", "geothermal tap", "bio-signatures",
    "review anomaly", "system status", "query", "analyze", "access", "proceed", "remove",
    "investigate", "focus", "north", "south", "east", "west", "up", "down",
    "diag_keycard", "return", "back" // Added return/back
];

const story = {
    intro: {
        onEnterText: [
            "Initializing GAIA Prime interface...",
            "Welcome, Warden <span class='accent'>{playerName}</span>.",
            "System assessment: Critical environmental anomaly detected in Sector Gamma-7. Your guidance is required."
        ],
        description: [
            "You are at the main <span class='commandable-keyword'>console</span> interface. Systems appear stable but an <span class='commandable-keyword'>alert</span> for Sector Gamma-7 is prominent.",
            "You could <span class='commandable-keyword'>examine</span> the <span class='commandable-keyword'>console</span> or the <span class='commandable-keyword'>alert</span>. Try to <span class='commandable-keyword'>search console</span> for tools. You can also check <span class='commandable-keyword'>system status</span> or <span class='commandable-keyword'>review anomaly</span> details."
        ],
        interactables: {
            "console": "The main interface console. Gleaming and cool to the touch. The <span class='commandable-keyword'>alert</span> for Gamma-7 pulses on screen. You could try to <span class='commandable-keyword'>search console</span>.",
            "alert": "A flashing red alert indicating unusual readings from Sector Gamma-7. Perhaps you should <span class='commandable-keyword'>review anomaly</span>.",
            "interface": "A holographic interface displaying system diagnostics and communication channels.",
            "system status": { type: "description", text: "Shows the current system status. Type '<span class='commandable-keyword'>system status</span>' to view."}, // Para que "examine system status" funcione
            "review anomaly": { type: "description", text: "Displays details about the anomaly. Type '<span class='commandable-keyword'>review anomaly</span>' to view."}
        },
        sceneActions: { 
            "review anomaly": "anomaly_details",
            "system status": "system_status",
            "search console": "search_console"
        },
        onEnter: () => {
            // updateStatusDisplay(); // Called at the end of renderScene
            gameState.firstLookInScene = true; 
        }
    },
    search_console: {
        onEnterText: ["You search an auxiliary port on the console... and find a forgotten <span class='commandable-keyword'>Diagnostic Keycard</span>."],
        description: ["The auxiliary <span class='commandable-keyword'>port</span> is now open. The <span class='commandable-keyword'>Diagnostic Keycard</span> has been added to your <span class='commandable-keyword'>inventory</span>. You can <span class='commandable-keyword'>return</span> to main console functions."],
        interactables: {
            "port": "An open auxiliary data port.",
            "diagnostic keycard": "A small, metallic keycard. It's now in your <span class='commandable-keyword'>inventory</span>.",
            "console": "The main console remains active."
        },
        sceneActions: {
            "return": "intro",
            "go back": "intro" 
        },
        onEnter: () => {
            addItemToInventory("diag_keycard", "Diagnostic Keycard");
            gameState.firstLookInScene = true;
        }
    },
    anomaly_details: {
        onEnterText: [
            "Anomaly data stream incoming: Unidentified bio-signature fluctuations and energy spikes originating from the old Terraforming Unit 7.",
            "Local AI Custodian, unit <span class='commandable-keyword'>Terra-3</span>, reports unusual organic growth patterns."
        ],
        description: [
            "The <span class='commandable-keyword'>data stream</span> regarding the Gamma-7 anomaly is active on your display.",
            "It highlights bio-signature spikes and energy readings from <span class='commandable-keyword'>Terraforming Unit 7</span>. Terra-3's <span class='commandable-keyword'>report</span> is also available.",
            "You could <span class='commandable-keyword'>query Terra-3</span> for a visual, <span class='commandable-keyword'>analyze energy</span> signature, or <span class='commandable-keyword'>proceed to Gamma-7</span>.",
            () => playerHasItem("diag_keycard") ? "You can also <span class='commandable-keyword'>access advanced diagnostics</span> with your keycard." : "Advanced diagnostics are available, but require a keycard."
        ],
        interactables: {
            "data stream": "Constantly updating sensor readings from Gamma-7. Mostly raw data.",
            "report": "Unit Terra-3's report: 'Unusual flora, rapid growth, energy patterns inconsistent. Requesting Warden guidance.' You can examine the full <span class='commandable-keyword'>terra-3 report</span>.",
            "terra-3 report": "Full Report from Terra-3: 'Bio-signatures are unlike anything cataloged. Energy spikes show a unique quantum entanglement pattern. Recommend immediate on-site analysis by Warden. Potential for rapid escalation.'",
            "terraforming unit 7": "Location of the anomaly. Records indicate it was decommissioned decades ago after the 'Silent Bloom' incident.",
            "terra-3": "The local AI Custodian for Sector Gamma-7. You could try to <span class='commandable-keyword'>query terra-3</span>."
        },
        sceneActions: {
            "query terra-3": "terra_3_visual",
            "analyze energy": "energy_analysis",
            "proceed to gamma-7": "gamma_7_arrival",
            "access advanced diagnostics": () => playerHasItem("diag_keycard") ? "advanced_diagnostics" : "diagnostics_no_keycard",
            "back": "intro", 
            "return": "intro"
        },
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    diagnostics_no_keycard: {
        onEnterText: ["You attempt to access advanced diagnostics, but the system requires a valid <span class='commandable-keyword'>Diagnostic Keycard</span>."],
        description: ["Advanced diagnostics are locked. You need a keycard. You can go <span class='commandable-keyword'>back</span> to the anomaly details."],
        interactables: {"diagnostic keycard": "You recall picking one up earlier. Check your <span class='commandable-keyword'>inventory</span>."},
        sceneActions: {"back": "anomaly_details", "return": "anomaly_details"},
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    advanced_diagnostics: {
        onEnterText: ["You insert the <span class='commandable-keyword'>Diagnostic Keycard</span>. Accessing deep system logs...", "The anomaly correlates with a power surge from an unauthorized <span class='commandable-keyword'>geothermal tap</span>. The <span class='commandable-keyword'>bio-signatures</span> are... adapting to it."],
        description: ["The advanced diagnostic screen shows the geothermal tap's location and the adapting bio-signatures' energy absorption patterns. You could <span class='commandable-keyword'>investigate geothermal tap</span>, <span class='commandable-keyword'>focus on bio-signatures</span>, or <span class='commandable-keyword'>remove keycard</span>."],
        interactables: {
            "diagnostic keycard": "The Diagnostic Keycard is currently inserted into the console. You can <span class='commandable-keyword'>remove keycard</span>.",
            "geothermal tap": "Data indicates an unregistered energy draw deep beneath Unit 7.",
            "bio-signatures": "The life forms are not only surviving but thriving on the anomalous energy, forming complex networks."
        },
        sceneActions: {
            "investigate geothermal tap": "geothermal_investigation",
            "focus on bio-signatures": "biosignature_focus",
            "remove keycard": { nextScene: "anomaly_details", onAction: () => displayText("Diagnostic Keycard removed.", false, "system-message", true) } 
        },
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    system_status: { /* ... (your existing system_status) ... */ },
    terra_3_visual: { /* ... (your existing terra_3_visual) ... */ },
    flora_scan: { /* ... (your existing flora_scan) ... */ },
    geothermal_investigation: { // Placeholder
        onEnterText: ["You head towards the geothermal tap readings. The heat intensifies."],
        description: ["The passage narrows. Strange markings glow faintly on the walls."],
        sceneActions: {"back": "advanced_diagnostics"},
        onEnter: () => gameState.firstLookInScene = true
    },
    biosignature_focus: { // Placeholder
        onEnterText: ["Focusing on the bio-signatures reveals a complex, hive-like consciousness emerging."],
        description: ["The bio-network seems aware of your observation."],
        sceneActions: {"back": "advanced_diagnostics"},
        onEnter: () => gameState.firstLookInScene = true
    },
    gamma_7_arrival: { /* ... (your existing gamma_7_arrival, ensure it uses sceneActions) ... */ },
    default_end: { /* ... (your existing default_end) ... */ }
};

// --- Inventory Functions ---
function addItemToInventory(itemId, itemName) {
    if (!playerHasItem(itemId)) {
        gameState.inventory.push({ id: itemId, name: itemName });
        // updateInventoryDisplay is called by updateStatusDisplay
        displayText(`System: ${itemName} added to inventory.`, false, 'system-message', true);
    }
}
function playerHasItem(itemId) { return gameState.inventory.some(item => item.id === itemId); }

function updateInventoryDisplay() {
    if (!inventoryDisplay) { console.warn("Inventory display element not found."); return; }
    inventoryDisplay.innerHTML = '';
    if (gameState.inventory.length === 0) {
        const p = document.createElement('p'); p.textContent = 'Empty'; p.classList.add('inventory-empty-message'); inventoryDisplay.appendChild(p);
    } else {
        const ul = document.createElement('ul'); ul.classList.add('inventory-list');
        gameState.inventory.forEach(item => {
            const li = document.createElement('li'); li.textContent = item.name; li.classList.add('inventory-item'); li.dataset.itemId = item.id; ul.appendChild(li);
        });
        inventoryDisplay.appendChild(ul);
    }
}

// --- Game Logic Functions ---
function processTextTemplate(text) {
    if (typeof text !== 'string') text = String(text); // Ensure text is a string
    return text.replace(/{playerName}/g, gameState.playerName)
               .replace(/{sectorStability}/g, gameState.sectorStability)
               .replace(/{aiSync}/g, gameState.aiSync);
}

function highlightKeywords(line, sceneDef) {
    if (typeof line !== 'string') return String(line);
    let highlightedLine = line;
    const interactableNames = sceneDef && sceneDef.interactables ? Object.keys(sceneDef.interactables) : [];
    const actionNames = sceneDef && sceneDef.sceneActions ? Object.keys(sceneDef.sceneActions) : [];
    const allKeywordsInScene = [...new Set([...COMMON_KEYWORDS, ...interactableNames, ...actionNames])];

    allKeywordsInScene.forEach(keyword => {
        if (!keyword || keyword.trim() === "") return;
        try {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b(${escapedKeyword})(?!<span class="commandable-keyword">)\\b(?![^<]*?>|[^<>]*<\\/span>)`, 'gi');
            highlightedLine = highlightedLine.replace(regex, (match) => `<span class="commandable-keyword">${match}</span>`);
        } catch (e) { console.warn("Regex error in highlightKeywords for keyword:", keyword, e); }
    });
    return highlightedLine;
}

async function typeText(element, textLines, sceneDef) {
    gameState.isTyping = true;
    console.log("typeText started, isTyping:", gameState.isTyping);
    try {
        element.innerHTML = '';
        for (const line of textLines) {
            let processedLine = typeof line === 'function' ? line() : line;
            processedLine = processTextTemplate(processedLine);
            const highlightedLine = highlightKeywords(processedLine, sceneDef);
            
            const p = document.createElement('p');
            p.classList.add('story-text-line');
            element.appendChild(p);
            let currentText = '';
            for (let i = 0; i < highlightedLine.length; i++) {
                if (highlightedLine[i] === '<') {
                    const tagEnd = highlightedLine.indexOf('>', i);
                    if (tagEnd !== -1) {
                        currentText += highlightedLine.substring(i, tagEnd + 1); i = tagEnd;
                    } else { currentText += highlightedLine[i]; }
                } else { currentText += highlightedLine[i]; }
                p.innerHTML = currentText;
                element.scrollTop = element.scrollHeight;
                if (TYPING_SPEED > 0 && (highlightedLine[i] !== '>' || (i > 0 && highlightedLine[i-1] ==='<'))) {
                     await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
                }
            }
            p.innerHTML = highlightedLine; // Ensure full line is rendered
            element.scrollTop = element.scrollHeight;
        }
    } catch (error) {
        console.error("Error during typeText:", error);
        element.innerHTML += '<p class="story-text-line system-message">Error typing text.</p>';
    } finally {
        gameState.isTyping = false; // CRITICAL: Always reset this flag
        console.log("typeText finished, isTyping:", gameState.isTyping);
    }
}

async function renderScene(sceneId) {
    console.log(`renderScene called for: ${sceneId}, current isTyping: ${gameState.isTyping}, current scene: ${gameState.currentScene}`);
    if (gameState.isTyping && sceneId !== gameState.currentScene && gameState.currentScene !== null ) {
        console.warn("Typing in progress, scene change deferred.");
        return;
    }
    try {
        const scene = story[sceneId] || story['default_end'];
        if (!scene) {
            console.error(`Scene not found: ${sceneId}`);
            await typeText(storyOutput, ["Error: Story progression lost."], story['default_end']);
            return;
        }
        
        const previousSceneId = gameState.currentScene;
        gameState.currentScene = sceneId;
        if (sceneId !== previousSceneId || !storyOutput.hasChildNodes()) {
            gameState.firstLookInScene = true;
        }

        // No longer generating choices buttons here
        // const choicesOutput = document.getElementById('choices-output'); // Already defined globally
        // if (choicesOutput) choicesOutput.innerHTML = ''; 
        // if (choicesOutput) choicesOutput.classList.remove('visible');


        let textToDisplay = [];
        if (gameState.firstLookInScene && scene.onEnterText) {
            textToDisplay = Array.isArray(scene.onEnterText) ? scene.onEnterText : [scene.onEnterText].map(line => typeof line === 'function' ? line() : line);
        } else if (scene.description) {
            textToDisplay = Array.isArray(scene.description) ? scene.description : [scene.description].map(line => typeof line === 'function' ? line() : line);
        } else { textToDisplay = ["You observe your surroundings. What do you do?"]; }
        
        await typeText(storyOutput, textToDisplay, scene);
        gameState.firstLookInScene = false;

        if (playerInput) playerInput.style.display = 'block';
        if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
        
        if (typeof scene.onEnter === 'function') {
            console.log(`Executing onEnter for scene: ${sceneId}`);
            scene.onEnter();
        }
        updateStatusDisplay(); // Update all status displays, including inventory
    } catch (error) {
        console.error("Error in renderScene:", error);
        storyOutput.innerHTML = '<p class="story-text-line system-message">Error rendering scene. Please try again or refresh.</p>';
        gameState.isTyping = false;
    }
}

function displayText(textLine, isCommandEcho = false, type = 'normal', immediate = false) {
    console.log(`displayText: "${textLine}", immediate: ${immediate}, type: ${type}`);
    const p = document.createElement('p');
    const templatedLine = processTextTemplate(textLine);
    // Apply highlighting only if it's a normal game message, not an echo or system message
    p.innerHTML = (!isCommandEcho && type === 'normal') ? highlightKeywords(templatedLine, story[gameState.currentScene]) : templatedLine;
    
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');
    
    storyOutput.appendChild(p);
    storyOutput.scrollTop = storyOutput.scrollHeight;
}

async function handlePlayerCommand(command) {
    console.log(`handlePlayerCommand: "${command}", isTyping before call: ${gameState.isTyping}`);
    // The isTyping check should be done by the event listener before calling this
    try {
        const lowerCommand = command.toLowerCase().trim();
        displayText(`> ${command}`, true); // Echo command

        let commandHandled = false;
        const currentSceneDef = story[gameState.currentScene];
        const parts = lowerCommand.split(/\s+/);
        const verb = parts[0];
        let target = parts.slice(1).join(" ").trim();
        let nextSceneToRender = gameState.currentScene; // Default to re-rendering current scene if no explicit change

        // 1. Scene-specific actions (sceneActions)
        if (currentSceneDef.sceneActions && currentSceneDef.sceneActions[lowerCommand]) {
            const actionResult = currentSceneDef.sceneActions[lowerCommand];
            let sceneToTransitionTo = null;

            if (typeof actionResult === 'string') {
                sceneToTransitionTo = actionResult;
            } else if (typeof actionResult === 'function') {
                const funcResult = actionResult(); // Execute function
                if (typeof funcResult === 'string') sceneToTransitionTo = funcResult; // Function might return next scene ID
            } else if (typeof actionResult === 'object' && actionResult.nextScene) { // For {nextScene: "...", onAction: func}
                if(actionResult.onAction && typeof actionResult.onAction === 'function') actionResult.onAction();
                sceneToTransitionTo = actionResult.nextScene;
            }
            
            if(sceneToTransitionTo) {
                await renderScene(sceneToTransitionTo);
            } else { // If action didn't specify a new scene, re-render current to show effects or messages
                await renderScene(gameState.currentScene);
            }
            commandHandled = true;
        }
        // 2. Global verb processing
        else {
            switch (verb) {
                case "look": case "mirar":
                    target = parts.length > 1 ? target : "around";
                    if (target === "around" || target === "") {
                        gameState.firstLookInScene = false; 
                        await renderScene(gameState.currentScene);
                    } else { 
                        if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                            const interactable = currentSceneDef.interactables[target];
                            const desc = typeof interactable === 'string' ? interactable : interactable.description || interactable.text || "It's a " + target + ".";
                            displayText(desc, false, 'system-message', true); // System message for examine results
                        } else {
                            displayText(`You don't see a "${target}" to look at closely.`, false, 'system-message', true);
                        }
                    }
                    commandHandled = true;
                    break;
                case "examine": case "x": case "inspeccionar":
                    if (!target) { displayText("Examine what?", false, 'system-message', true); }
                    else if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                        const interactable = currentSceneDef.interactables[target];
                        const desc = typeof interactable === 'string' ? interactable : interactable.description || interactable.text || "It's a " + target + ".";
                        displayText(desc, false, 'system-message', true); // System message for examine results
                    } else {
                        displayText(`You find nothing special about the <span class="commandable-keyword">${target}</span>.`, false, 'system-message', true);
                    }
                    commandHandled = true;
                    break;
                case "inventory": case "i":
                    let inventoryTextLines = [];
                    if (gameState.inventory.length === 0) { inventoryTextLines.push("Your inventory is empty."); }
                    else {
                        inventoryTextLines.push("You are carrying:");
                        gameState.inventory.forEach((item) => { inventoryTextLines.push(`- <span class="commandable-keyword">${item.name}</span>`); });
                    }
                    for (const line of inventoryTextLines) { displayText(line, false, 'system-message', true); }
                    commandHandled = true;
                    break;
                case "use": 
                    // Basic use logic - can be expanded significantly
                    const itemToUseName = target.split(" on ")[0].trim();
                    const useTargetObject = target.includes(" on ") ? target.split(" on ")[1].trim() : null;
                    const itemInInventory = gameState.inventory.find(item => item.name.toLowerCase().includes(itemToUseName.toLowerCase()));

                    if (itemInInventory) {
                        displayText(`You attempt to use the ${itemInInventory.name}...`, false, 'system-message', true);
                        // Add logic here for item uses defined in story[gameState.currentScene].itemUses
                        // For now, just a placeholder
                        displayText(`(Define what happens when ${itemInInventory.name} is used${useTargetObject ? ' on ' + useTargetObject : ''})`, false, 'system-message', true);

                    } else {
                        displayText("You don't have that item.", false, 'system-message', true);
                    }
                    commandHandled = true;
                    break;
                case "help": case "?": case "ayuda":
                    showHelpModal();
                    commandHandled = true;
                    break;
            }
        }
        
        if (!commandHandled) {
            displayText("I didn't understand that. Type `<span class=\"commandable-keyword\">help</span>` for common commands.", false, 'system-message', true);
        }
    } catch (error) {
        console.error("Error in handlePlayerCommand:", error);
        displayText("An error occurred processing your command.", false, 'system-message', true);
    } finally {
        if (playerInput && document.activeElement !== playerInput) {
            setTimeout(() => playerInput.focus(), 0);
        }
        console.log("handlePlayerCommand finished.");
    }
}

// --- Funciones para el Modal de Ayuda ---
function showHelpModal() { /* ... (como antes) ... */ }
function closeHelpModalFunc() { /* ... (como antes) ... */ }

// --- updateStatusDisplay e initializeGame ---
function updateStatusDisplay() {
    console.log("Updating status display...");
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;
    updateInventoryDisplay();
}

async function initializeGame() {
    console.log("Initializing game...");
    const statusPanel = document.getElementById('status-panel'); // Define statusPanel here

    if (!storyOutput || !playerInput || !submitCommandButton || !statusPanel || !inventoryDisplay || !helpModal || !helpContent || !closeHelpButton) {
        console.error("One or more critical UI elements are missing. Aborting game initialization.");
        if(storyOutput) storyOutput.innerHTML = "<p class='story-text-line system-message'>Error: Critical UI elements missing. Game cannot start. Check IDs in HTML and JS.</p>";
        return;
    }

    const elementsToFade = [storyOutput, statusPanel];
    if (playerInput && playerInput.parentElement) elementsToFade.push(playerInput.parentElement);
    
    elementsToFade.forEach(el => { if(el) el.classList.add('initial-load-fade'); });
    
    updateStatusDisplay();
    await renderScene(gameState.currentScene); 
    
    const currentSceneData = story[gameState.currentScene];
    const initialTextArray = currentSceneData?.onEnterText || currentSceneData?.description || [""];
    const initialTextLength = Array.isArray(initialTextArray) ? initialTextArray.flat().join("").length : String(initialTextArray).length;

    setTimeout(() => { 
        if (!gameState.isTyping) {
             displayText("Type `<span class=\"commandable-keyword\">look around</span>` to observe, or `<span class=\"commandable-keyword\">help</span>` for commands.", false, "system-message", true);
        }
        if (playerInput) playerInput.focus();
    }, initialTextLength * TYPING_SPEED + 900);

    setTimeout(() => {
        elementsToFade.forEach(el => { if(el) el.classList.remove('initial-load-fade'); });
    }, 600);
    console.log("Game initialized.");
}

// --- Event Listeners ---
if (submitCommandButton) {
    submitCommandButton.addEventListener('click', async () => {
        console.log("Send button clicked. isTyping:", gameState.isTyping);
        if (gameState.isTyping) return;
        const command = playerInput.value;
        if (command.trim()) {
            playerInput.value = ''; // Clear input before handling
            await handlePlayerCommand(command);
        } else {
            if(playerInput) playerInput.focus(); // Refocus if empty command
        }
    });
} else { console.error("Submit button (submit-command) not found!"); }

if (playerInput) {
    playerInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            console.log("Enter key pressed. isTyping:", gameState.isTyping);
            event.preventDefault(); 
            if (gameState.isTyping) return;
            const command = playerInput.value;
            if (command.trim()) {
                playerInput.value = ''; // Clear input before handling
                await handlePlayerCommand(command);
            }
        }
    });
} else { console.error("Player input field (player-input) not found!"); }

if(closeHelpButton) {
    closeHelpButton.addEventListener('click', closeHelpModalFunc);
} else { console.warn("Close help button (close-help-modal) not found."); }

if(helpModal) {
    helpModal.addEventListener('click', (event) => { 
        if (event.target === helpModal) { // Only close if overlay itself is clicked
            closeHelpModalFunc();
        }
    });
} else { console.warn("Help modal (help-modal) not found."); }

// Start the game
initializeGame();
