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
    currentScene: "intro",
    inventory: [],
    sectorStability: 100,
    aiSync: 100,
    isTyping: false,
    firstLookInScene: true,
};

// --- Typing Speed ---
const TYPING_SPEED = 10; // Kept it faster

// --- Keywords & Story Data ---
const COMMON_KEYWORDS = [
    "look", "examine", "use", "take", "go", "inventory", "help", "status", "search",
    "mirar", "examinar", "usar", "coger", "ir", "inventario", "ayuda", "estado", "buscar",
    "console", "alert", "interface", "port", "keycard", "diagnostic keycard",
    "data stream", "report", "terra-3", "terraforming unit 7", "geothermal tap", "bio-signatures",
    "review anomaly", "system status", "query", "analyze", "access", "proceed", "remove",
    "investigate", "focus", "north", "south", "east", "west", "up", "down",
    "diag_keycard", "return", "back"
];

const story = { // Tu objeto story existente...
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
            "system status": { type: "description", text: "Shows the current system status. Type '<span class='commandable-keyword'>system status</span>' to view."},
            "review anomaly": { type: "description", text: "Displays details about the anomaly. Type '<span class='commandable-keyword'>review anomaly</span>' to view."}
        },
        sceneActions: { 
            "review anomaly": "anomaly_details",
            "system status": "system_status",
            "search console": "search_console"
        },
        onEnter: () => {
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
        sceneActions: { "return": "intro", "go back": "intro" },
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
            "query terra-3": "terra_3_visual", "analyze energy": "energy_analysis",
            "proceed to gamma-7": "gamma_7_arrival",
            "access advanced diagnostics": () => playerHasItem("diag_keycard") ? "advanced_diagnostics" : "diagnostics_no_keycard",
            "back": "intro", "return": "intro"
        },
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    diagnostics_no_keycard: { /* ... */ },
    advanced_diagnostics: { /* ... */ },
    system_status: { /* ... */ },
    terra_3_visual: { /* ... */ },
    flora_scan: { /* ... */ },
    geothermal_investigation: { /* ... */ },
    biosignature_focus: { /* ... */ },
    gamma_7_arrival: { /* ... */ },
    default_end: { /* ... */ }
};

// --- Inventory Functions ---
function addItemToInventory(itemId, itemName) {
    if (!playerHasItem(itemId)) {
        gameState.inventory.push({ id: itemId, name: itemName });
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
    if (typeof text !== 'string') text = String(text);
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

// Function to scroll the main window to the top of the storyOutput element
function scrollWindowToStoryOutput() {
    if (storyOutput) {
        // Get the position of the storyOutput relative to the viewport
        const storyOutputRect = storyOutput.getBoundingClientRect();
        // Scroll the window so that the top of storyOutput is at the top of the viewport
        // window.scrollTo(0, window.pageYOffset + storyOutputRect.top); // Instant
        window.scrollTo({
            top: window.pageYOffset + storyOutputRect.top - parseInt(getComputedStyle(document.querySelector('.rpg-header')).height || '60'), // Adjust for fixed header height
            behavior: 'smooth'
        });
    }
}

function scrollToStoryOutputBottom() {
    if (storyOutput) {
        storyOutput.scrollTop = storyOutput.scrollHeight;
    }
}

async function typeText(element, textLines, sceneDef) {
    gameState.isTyping = true;
    console.log("typeText started, isTyping:", gameState.isTyping);
    try {
        element.innerHTML = ''; 
        scrollWindowToStoryOutput(); // Scroll main window smoothly to story output top

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
                scrollToStoryOutputBottom();
                if (TYPING_SPEED > 0 && (highlightedLine[i] !== '>' || (i > 0 && highlightedLine[i-1] ==='<'))) {
                     await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
                }
            }
            p.innerHTML = highlightedLine;
            scrollToStoryOutputBottom();
        }
    } catch (error) {
        console.error("Error during typeText:", error);
        element.innerHTML += '<p class="story-text-line system-message">Error typing text.</p>';
    } finally {
        gameState.isTyping = false;
        console.log("typeText finished, isTyping:", gameState.isTyping);
        scrollToStoryOutputBottom();
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
        updateStatusDisplay();
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
    p.innerHTML = (!isCommandEcho && type === 'normal') ? highlightKeywords(templatedLine, story[gameState.currentScene]) : templatedLine;
    
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');
    
    storyOutput.appendChild(p);
    scrollToStoryOutputBottom(); 
}

async function handlePlayerCommand(command) {
    console.log(`handlePlayerCommand: "${command}", isTyping before call: ${gameState.isTyping}`);
    try {
        const lowerCommand = command.toLowerCase().trim();
        displayText(`> ${command}`, true); 

        let commandHandled = false;
        const currentSceneDef = story[gameState.currentScene];
        const parts = lowerCommand.split(/\s+/);
        const verb = parts[0];
        let target = parts.slice(1).join(" ").trim();
        let nextSceneToRender = null;

        if (currentSceneDef.sceneActions && currentSceneDef.sceneActions[lowerCommand]) {
            const actionResult = currentSceneDef.sceneActions[lowerCommand];
            if (typeof actionResult === 'string') {
                nextSceneToRender = actionResult;
            } else if (typeof actionResult === 'function') {
                const funcResult = actionResult();
                if (typeof funcResult === 'string') nextSceneToRender = funcResult;
            } else if (typeof actionResult === 'object' && actionResult.nextScene) {
                if(actionResult.onAction && typeof actionResult.onAction === 'function') actionResult.onAction();
                nextSceneToRender = actionResult.nextScene;
            }
            commandHandled = true;
        } else {
            switch (verb) {
                case "look": case "mirar":
                    target = parts.length > 1 ? target : "around";
                    if (target === "around" || target === "") {
                        gameState.firstLookInScene = false; 
                        nextSceneToRender = gameState.currentScene;
                    } else { 
                        if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                            const interactable = currentSceneDef.interactables[target];
                            const desc = typeof interactable === 'string' ? interactable : interactable.description || interactable.text || "It's a " + target + ".";
                            displayText(desc, false, 'system-message', true);
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
                        displayText(desc, false, 'system-message', true);
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
                    const itemToUseName = target.split(" on ")[0].trim();
                    const useTargetObject = target.includes(" on ") ? target.split(" on ")[1].trim() : null;
                    const itemInInventory = gameState.inventory.find(item => item.name.toLowerCase().includes(itemToUseName.toLowerCase()));

                    if (itemInInventory) {
                        displayText(`You attempt to use the ${itemInInventory.name}...`, false, 'system-message', true);
                        // This is placeholder logic for 'use'. You'll need to expand this.
                        // Example: Check currentSceneDef.itemUses[itemInInventory.id]
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
        
        if (nextSceneToRender) {
            await renderScene(nextSceneToRender);
        } else if (!commandHandled) {
             displayText("I didn't understand that. Type `<span class=\"commandable-keyword\">help</span>` for common commands.", false, 'system-message', true);
        }

    } catch (error) {
        console.error("Error in handlePlayerCommand:", error);
        displayText("An error occurred processing your command.", false, 'system-message', true);
    } finally {
        // Re-focus input only if help modal is not shown
        if (playerInput && document.activeElement !== playerInput && (!helpModal || helpModal.style.display === 'none')) {
            setTimeout(() => playerInput.focus(), 0); 
        }
        console.log("handlePlayerCommand finished.");
    }
}

// --- Funciones para el Modal de Ayuda ---
function showHelpModal() {
    if (!helpModal || !helpContent) { console.error("Help modal elements not found!"); return; }
    console.log("Showing help modal...");
    // CORRECTED: Use COMMON_KEYWORDS here
    const commonVerbsInHelp = COMMON_KEYWORDS.filter(k => 
        ["look", "examine", "use", "take", "go", "inventory", "help", "status", "search", "mirar", "examinar", "usar", "coger", "ir", "inventario", "ayuda", "estado", "buscar"]
        .includes(k.toLowerCase())); // You can refine this list for the help text
    const commonVerbsText = commonVerbsInHelp.map(v => `<span class="commandable-keyword">${v}</span>`).join(", ");
    
    helpContent.innerHTML = `
        <h3>Common Commands</h3>
        <p>Interact by typing commands. Some common verbs are:</p>
        <ul>
            <li><strong><span class="commandable-keyword">look</span></strong> or <strong><span class="commandable-keyword">look around</span></strong>: Describes your current surroundings.</li>
            <li><strong><span class="commandable-keyword">examine</span> [thing/person]</strong>: Get more details (e.g., '<span class="commandable-keyword">examine console</span>').</li>
            <li><strong><span class="commandable-keyword">inventory</span></strong> or <strong><span class="commandable-keyword">i</span></strong>: Check your items.</li>
            <li><strong><span class="commandable-keyword">use</span> [item] on [target]</strong>: Use an item from your inventory on something.</li>
            <li><strong><span class="commandable-keyword">take</span> [item]</strong>: Pick up an item (if available).</li>
            <li><strong><span class="commandable-keyword">go</span> [direction/place]</strong>: Move to a new location (e.g., '<span class="commandable-keyword">go north</span>', not yet implemented).</li>
            <li><strong><span class="commandable-keyword">status</span></strong>: Check game status like Sector Stability.</li>
        </ul>
        <p>Keywords in the story text are often highlighted in <span class="commandable-keyword">this color</span> and can be used in your commands (e.g., as targets for 'examine', or as direct actions).</p>
        <p>Other potentially useful terms: ${commonVerbsText}. Context is key!</p>
    `;
    helpModal.style.display = 'flex';
}
function closeHelpModalFunc() { 
    if (helpModal) helpModal.style.display = 'none'; 
    console.log("Help modal closed."); 
    if (playerInput) playerInput.focus(); // Return focus to input after closing help
}

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
    const statusPanel = document.getElementById('status-panel');

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
    const flatInitialText = Array.isArray(initialTextArray) ? 
        initialTextArray.map(line => typeof line === 'function' ? line() : line).join("") : 
        String(typeof initialTextArray === 'function' ? initialTextArray() : initialTextArray);
    const initialTextLength = flatInitialText.length;

    const guidanceMessageDelay = 200; // Made guidance message appear even faster
    setTimeout(() => { 
        if (!gameState.isTyping) {
             displayText("Type `<span class=\"commandable-keyword\">look around</span>` to observe, or `<span class=\"commandable-keyword\">help</span>` for commands.", false, "system-message", true);
        }
        if (playerInput) playerInput.focus();
    }, initialTextLength * TYPING_SPEED + guidanceMessageDelay);

    setTimeout(() => {
        elementsToFade.forEach(el => { if(el) el.classList.remove('initial-load-fade'); });
    }, 600); 
    console.log("Game initialized.");
}

// --- Event Listeners ---
if (submitCommandButton) {
    submitCommandButton.addEventListener('click', async () => {
        console.log("Send button clicked. isTyping:", gameState.isTyping);
        if (gameState.isTyping) {
            console.log("Send button: Typing in progress, command ignored.");
            return;
        }
        const command = playerInput.value;
        if (command.trim()) {
            playerInput.value = ''; 
            await handlePlayerCommand(command);
        } else {
            if(playerInput) playerInput.focus(); 
        }
    });
} else { console.error("Submit button (submit-command) not found!"); }

if (playerInput) {
    playerInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            console.log("Enter key pressed. isTyping:", gameState.isTyping);
            event.preventDefault(); 
            if (gameState.isTyping) {
                console.log("Enter key: Typing in progress, command ignored.");
                return;
            }
            const command = playerInput.value;
            if (command.trim()) {
                playerInput.value = ''; 
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
        if (event.target === helpModal) { 
            closeHelpModalFunc();
        }
    });
} else { console.warn("Help modal (help-modal) not found."); }

// Start the game
initializeGame();
