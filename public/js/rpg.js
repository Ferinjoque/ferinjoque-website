// public/js/rpg.js

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
// const choicesOutput = document.getElementById('choices-output'); // Ya no se usará para botones principales
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');
const inventoryDisplay = document.getElementById('inventory-items');
// Para la ayuda mejorada (Modal)
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
const TYPING_SPEED = 15;

// --- Lista de Verbos y Palabras Clave Comunes para Resaltar ---
// Amplía esta lista según los comandos que implementes y los objetos de tu juego
const COMMON_KEYWORDS = [
    "look", "examine", "use", "take", "go", "inventory", "help", "status", "search",
    "mirar", "examinar", "usar", "coger", "ir", "inventario", "ayuda", "estado", "buscar",
    "console", "alert", "interface", "port", "keycard", "diagnostic keycard",
    "data stream", "report", "terra-3", "terraforming unit 7", "geothermal tap", "bio-signatures",
    "review anomaly", "system status", "query", "analyze", "access", "proceed", "remove",
    "investigate", "focus", "north", "south", "east", "west", "up", "down", // Direcciones
    // Añade aquí los IDs de tus objetos de inventario a medida que los creas
    "diag_keycard"
];


// --- Story Data (Modificada para no depender de 'choices' para la interacción principal) ---
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
            "system status": { type: "description", text: "Shows the current system status. Type '<span class='commandable-keyword'>system status</span>' to view."},
            "review anomaly": { type: "description", text: "Displays details about the anomaly. Type '<span class='commandable-keyword'>review anomaly</span>' to view."}
        },
        sceneActions: { // Acciones posibles desde esta escena a través de comandos
            "review anomaly": "anomaly_details",
            "system status": "system_status",
            "search console": "search_console"
        },
        onEnter: () => {
            updateStatusDisplay();
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
            "go back": "intro" // Alias
        },
        onEnter: () => {
            addItemToInventory("diag_keycard", "Diagnostic Keycard");
            // updateStatusDisplay(); // No es necesario, onEnter de 'intro' lo hará
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
            "back": "intro", // Opción para volver
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
            "remove keycard": { nextScene: "anomaly_details", onAction: () => displayText("Diagnostic Keycard removed.", false, "system-message", true) } // Usar onAction
        },
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    system_status: {
        onEnterText: [
            "GAIA Prime Core: Optimal. Sector Stability: {sectorStability}%. AI Synchronization: {aiSync}%.",
            "No other critical alerts at this time. You can go <span class='commandable-keyword'>back</span>."
        ],
        description: [
            "System status screen is active. All primary systems report green. You can go <span class='commandable-keyword'>back</span> to the main console."
        ],
        interactables: {
            "core status": "GAIA Prime Core Efficiency: 100%. Last diagnostic: nominal.",
            "sector stability": "Current Sector Stability readings are at {sectorStability}%.",
            "ai synchronization": "AI Network Synchronization is at {aiSync}%."
        },
        sceneActions: {"back": "intro", "return": "intro"},
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    // ... (Escenas de ejemplo adicionales para terra_3_visual, etc.)
    terra_3_visual: {
        onEnterText: ["Connecting to Terra-3's visual feed... Stand by.", "Feed established. The image shows dense, rapidly pulsing flora enveloping the old Terraforming Unit 7. It's unlike anything in GAIA's database."],
        description: ["The visual feed from <span class='commandable-keyword'>Terra-3</span> is active. The strange flora pulses with an eerie light. You could <span class='commandable-keyword'>scan flora</span> or go <span class='commandable-keyword'>back</span>."],
        interactables: {
            "flora": "A thick, vine-like plant mass, glowing faintly. It seems to be the source of the bio-signature fluctuations.",
            "terra-3": "The AI Custodian providing the feed. Its connection seems stable."
        },
        sceneActions: {
            "scan flora": "flora_scan",
            "back": "anomaly_details"
        },
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    flora_scan: {
        onEnterText: ["Initiating remote scan of the flora via Terra-3's sensors...", "Scan complete: Composition unknown. Exhibits signs of extremely rapid cellular regeneration and emits a low-frequency bio-acoustic hum. It appears to be drawing energy directly from the Terraforming Unit."],
        description: ["The scan results are on screen. The flora is a biological enigma. You can go <span class='commandable-keyword'>back</span>."],
        interactables: {"scan results": "Detailed biological and energy readings of the flora. Too complex for immediate full analysis without further tools."},
        sceneActions: {"back": "terra_3_visual"},
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    default_end: {
        onEnterText: ["This path is still under development, or you've reached a temporary end-point. You could <span class='commandable-keyword'>restart</span>."],
        description: ["There's nothing more to see or do here for now. Try to <span class='commandable-keyword'>restart</span>?"],
        sceneActions: {"restart": "intro"},
        onEnter: () => { gameState.firstLookInScene = true; }
    }
};

// --- Inventory Functions (sin cambios) ---
function addItemToInventory(itemId, itemName) {
    if (!playerHasItem(itemId)) {
        gameState.inventory.push({ id: itemId, name: itemName });
        updateInventoryDisplay();
        // Consider a system message for adding items, perhaps not via typeText to make it immediate
        displayText(`System: ${itemName} added to inventory.`, false, 'system-message', true);
    }
}
function playerHasItem(itemId) { return gameState.inventory.some(item => item.id === itemId); }
function updateInventoryDisplay() { /* ... (como antes) ... */ }


// --- Game Logic Functions ---
function processTextTemplate(text) { return text.replace(/{playerName}/g, gameState.playerName).replace(/{sectorStability}/g, gameState.sectorStability).replace(/{aiSync}/g, gameState.aiSync); }

function highlightKeywords(line, sceneDef) {
    let highlightedLine = line;
    const interactableNames = sceneDef && sceneDef.interactables ? Object.keys(sceneDef.interactables) : [];
    const actionNames = sceneDef && sceneDef.sceneActions ? Object.keys(sceneDef.sceneActions) : [];
    
    const allKeywordsInScene = [...new Set([...COMMON_KEYWORDS, ...interactableNames, ...actionNames])];

    allKeywordsInScene.forEach(keyword => {
        if (!keyword || keyword.trim() === "") return; // Skip empty keywords
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapar caracteres especiales para regex
        const regex = new RegExp(`\\b(${escapedKeyword})(?!<span class="commandable-keyword">)\\b(?![^<]*?>|[^<>]*<\\/span>)`, 'gi');
        highlightedLine = highlightedLine.replace(regex, (match) => `<span class="commandable-keyword">${match}</span>`);
    });
    return highlightedLine;
}


async function typeText(element, textLines, sceneDef) { // Pasar sceneDef para highlightKeywords
    gameState.isTyping = true;
    element.innerHTML = '';
    for (const line of textLines) {
        let processedLine = typeof line === 'function' ? line() : line; // Ejecutar si es una función (para descripciones dinámicas)
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
                    currentText += highlightedLine.substring(i, tagEnd + 1);
                    i = tagEnd;
                } else { currentText += highlightedLine[i]; }
            } else { currentText += highlightedLine[i]; }
            p.innerHTML = currentText;
            element.scrollTop = element.scrollHeight;
            if (highlightedLine[i] !== '>' || (i > 0 && highlightedLine[i-1] ==='<')) {
                 await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
            }
        }
        p.innerHTML = highlightedLine;
        element.scrollTop = element.scrollHeight;
    }
    gameState.isTyping = false;
}

async function renderScene(sceneId) {
    if (gameState.isTyping && sceneId !== gameState.currentScene) return;

    const scene = story[sceneId] || story['default_end'];
    if (!scene) { /* ... error handling ... */ return; }
    
    const previousSceneId = gameState.currentScene;
    gameState.currentScene = sceneId;
    if (sceneId !== previousSceneId || !storyOutput.hasChildNodes()) { // Si es nueva escena o el output está vacío
        gameState.firstLookInScene = true;
    }

    // choicesOutput.innerHTML = ''; // Ya no hay botones de opción fijos aquí
    // choicesOutput.classList.remove('visible');

    let textToDisplay = [];
    if (gameState.firstLookInScene && scene.onEnterText) {
        textToDisplay = Array.isArray(scene.onEnterText) ? scene.onEnterText : [scene.onEnterText];
    } else if (scene.description) {
        textToDisplay = Array.isArray(scene.description) ? scene.description : [scene.description];
    } else { textToDisplay = ["You observe your surroundings. What do you do?"]; }
    
    await typeText(storyOutput, textToDisplay, scene); // Pasar 'scene' para resaltar palabras clave
    gameState.firstLookInScene = false;

    if (playerInput) playerInput.style.display = 'block';
    if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
    if (playerInput && document.activeElement !== playerInput) {
        setTimeout(() => playerInput.focus(), 50);
    }
    
    if (typeof scene.onEnter === 'function') scene.onEnter();
    updateStatusDisplay(); // Mover aquí para que el inventario se actualice después de onEnter si añade objetos
}

// displayText: modificado para aceptar 'immediate' y llamar a highlightKeywords opcionalmente
function displayText(textLine, isCommandEcho = false, type = 'normal', immediate = false) {
    const p = document.createElement('p');
    const templatedLine = processTextTemplate(textLine);
    // Resaltar solo si no es eco de comando y no es mensaje de sistema (o decidir tu lógica)
    p.innerHTML = (!isCommandEcho && type === 'normal') ? highlightKeywords(templatedLine, story[gameState.currentScene]) : templatedLine;
    
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');
    
    storyOutput.appendChild(p);
    storyOutput.scrollTop = storyOutput.scrollHeight;

    if (immediate) {
        // No es necesario hacer p.style.opacity = 1 si no hay animaciones de opacidad en .story-text-line por defecto
    }
}


async function handlePlayerCommand(command) {
    if (gameState.isTyping) return;

    const lowerCommand = command.toLowerCase().trim();
    displayText(`> ${command}`, true);

    let commandHandled = false;
    const currentSceneDef = story[gameState.currentScene];
    const parts = lowerCommand.split(/\s+/);
    const verb = parts[0];
    let target = parts.slice(1).join(" ").trim(); // Puede ser un objeto o varias palabras

    // Intentar primero con sceneActions (comandos directos/frases completas)
    if (currentSceneDef.sceneActions && currentSceneDef.sceneActions[lowerCommand]) {
        const actionResult = currentSceneDef.sceneActions[lowerCommand];
        if (typeof actionResult === 'string') {
            await renderScene(actionResult);
        } else if (typeof actionResult === 'function') {
            const nextSceneFromFunc = actionResult();
            if (nextSceneFromFunc && typeof nextSceneFromFunc === 'string') {
                await renderScene(nextSceneFromFunc);
            } else { await renderScene(gameState.currentScene); }
        } else if (typeof actionResult === 'object' && actionResult.nextScene) {
            if(actionResult.onAction && typeof actionResult.onAction === 'function') actionResult.onAction();
            await renderScene(actionResult.nextScene);
        }
        commandHandled = true;
    }
    // Si no, procesar por verbo
    else {
        switch (verb) {
            case "look": case "mirar":
                target = parts.length > 1 ? parts.slice(1).join(" ").trim() : "around"; // Asumir "around" si solo es "look"
                if (target === "around" || target === "" || target === "sitio" || target === "alrededor") {
                    gameState.firstLookInScene = false; // Forzar que muestre 'description'
                    await renderScene(gameState.currentScene);
                } else { // "look [at] target" es como "examine target"
                    if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                        const interactable = currentSceneDef.interactables[target];
                        displayText(highlightKeywords(processTextTemplate(typeof interactable === 'string' ? interactable : interactable.description || "It's a " + target + "."), currentSceneDef), false, 'system-message');
                    } else {
                        displayText(`You don't see a "${target}" to look at closely.`, false, 'system-message');
                    }
                }
                commandHandled = true;
                break;
            case "examine": case "x": case "inspeccionar":
                if (!target) {
                    displayText("Examine what?", false, 'system-message');
                } else if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                    const interactable = currentSceneDef.interactables[target];
                     if(typeof interactable === 'string') {
                        displayText(highlightKeywords(processTextTemplate(interactable), currentSceneDef), false, 'system-message');
                    } else if (interactable.description) {
                        displayText(highlightKeywords(processTextTemplate(interactable.description), currentSceneDef), false, 'system-message');
                    } else if (interactable.text) { // Si el interactable es un comando disfrazado
                         displayText(highlightKeywords(processTextTemplate(interactable.text), currentSceneDef), false, 'system-message');
                    }
                } else {
                    displayText(`You find nothing special about the <span class="commandable-keyword">${target}</span>.`, false, 'system-message');
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
            case "use": /* ... (tu lógica de 'use' como antes, asegúrate que no dependa de botones eliminados) ... */ commandHandled = true; break;
            case "help": case "?": case "ayuda":
                showHelpModal();
                commandHandled = true;
                break;
            // Añade más verbos globales aquí: "take", "go", "talk", etc.
            // Ejemplo "take":
            // case "take": case "get": case "coger":
            //     if (!target) { displayText("Take what?", false, "system-message"); }
            //     else if (currentSceneDef.takeableItems && currentSceneDef.takeableItems[target]) {
            //         const itemDetails = currentSceneDef.takeableItems[target];
            //         addItemToInventory(target, itemDetails.name || target);
            //         displayText(itemDetails.takeText || `You take the ${target}.`, false, "system-message");
            //         delete currentSceneDef.takeableItems[target]; // Remove from scene
            //         if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
            //             delete currentSceneDef.interactables[target]; // Also remove from examinables
            //         }
            //     } else {
            //         displayText(`You can't take the ${target}.`, false, "system-message");
            //     }
            //     commandHandled = true;
            //     break;
        }
    }
    
    if (!commandHandled) {
        displayText("I didn't understand that. Type `<span class=\"commandable-keyword\">help</span>` for common commands.", false, 'system-message');
    }

    if (playerInput && document.activeElement !== playerInput) {
        setTimeout(() => playerInput.focus(), 0);
    }
}

// --- Funciones para el Modal de Ayuda ---
function showHelpModal() {
    if (!helpModal || !helpContent) return;
    const commonVerbsText = COMMON_KEYWORDS.filter(k => COMMON_VERBS.includes(k)).map(v => `<span class="commandable-keyword">${v}</span>`).join(", ");
    
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
        <p>Other potentially useful verbs: ${commonVerbsText}. Context is key!</p>
    `;
    helpModal.style.display = 'flex';
}

function closeHelpModalFunc() { if (helpModal) helpModal.style.display = 'none'; }

// --- Event Listeners ---
// ... (submitCommandButton y playerInput sin cambios, pero ahora son más importantes) ...
if(closeHelpButton) closeHelpButton.addEventListener('click', closeHelpModalFunc);
if(helpModal) helpModal.addEventListener('click', (event) => { if (event.target === helpModal) closeHelpModalFunc(); });

// --- updateStatusDisplay e initializeGame ---
function updateStatusDisplay() { /* ... (como antes, llama a updateInventoryDisplay) ... */ }
async function initializeGame() {
    const elementsToFade = [storyOutput, document.getElementById('status-panel')]; // choicesOutput ya no es relevante para este fade
    if (playerInput && playerInput.parentElement) elementsToFade.push(playerInput.parentElement);
    
    elementsToFade.forEach(el => { if(el) el.classList.add('initial-load-fade'); });
    
    updateStatusDisplay();
    await renderScene(gameState.currentScene);
    
    const initialTextLength = (story[gameState.currentScene].onEnterText || story[gameState.currentScene].description || [""]).flat().join("").length;
    setTimeout(() => { 
        if (!gameState.isTyping) {
             displayText("Type `<span class=\"commandable-keyword\">look around</span>` to observe, or `<span class=\"commandable-keyword\">help</span>` for commands.", false, "system-message", true);
        }
    }, initialTextLength * TYPING_SPEED + 700);

    setTimeout(() => {
        elementsToFade.forEach(el => { if(el) el.classList.remove('initial-load-fade'); });
        if (playerInput) playerInput.focus();
    }, 600);
}

// Start the game
initializeGame();
