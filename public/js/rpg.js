// public/js/rpg.js

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const choicesOutput = document.getElementById('choices-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');
const inventoryDisplay = document.getElementById('inventory-items');

// --- Game State ---
let gameState = {
    playerName: "Warden",
    currentScene: "intro",
    inventory: [],
    sectorStability: 100,
    aiSync: 100,
    isTyping: false,
    firstLookInScene: true, // Para diferenciar el texto de entrada del de "look"
};

// --- Typing Speed & Delays ---
const TYPING_SPEED = 15;
const CHOICE_FADE_IN_DELAY_INCREMENT = 100;

// --- Story Data ---
const story = {
    intro: {
        onEnterText: [ // Texto que se muestra al entrar por primera vez a la escena
            "Initializing GAIA Prime interface...",
            "Welcome, Warden <span class='accent'>{playerName}</span>.",
            "System assessment: Critical environmental anomaly detected in Sector Gamma-7. Your guidance is required."
        ],
        description: [ // Texto que se muestra con "look" o si no hay onEnterText
            "You are at the main console interface. Systems appear stable but an alert for Sector Gamma-7 is prominent.",
            "Available actions: Review anomaly details, Check system status, or Search console."
        ],
        interactables: {
            "console": "The main interface console. Gleaming and cool to the touch. The alert for Gamma-7 pulses on screen.",
            "alert": "A flashing red alert indicating unusual readings from Sector Gamma-7.",
            "interface": "A holographic interface displaying system diagnostics and communication channels."
        },
        choices: [
            { text: "Review anomaly details.", nextScene: "anomaly_details" },
            { text: "Check system status.", nextScene: "system_status" },
            { text: "Search the console for useful tools.", nextScene: "search_console" }
        ],
        onEnter: () => {
            updateStatusDisplay();
            gameState.firstLookInScene = true; // Marcar para usar onEnterText
        }
    },
    search_console: {
        onEnterText: ["You search an auxiliary port on the console... and find a forgotten <span class='accent'>Diagnostic Keycard</span>."],
        description: ["The auxiliary port is now open. Nothing else of interest here."],
        interactables: {
            "port": "An open auxiliary data port. It seems to have accepted the keycard previously.",
            "console": "The main console remains active."
        },
        onEnter: () => {
            addItemToInventory("diag_keycard", "Diagnostic Keycard");
            updateStatusDisplay();
            gameState.firstLookInScene = true;
        },
        choices: [
            { text: "Return to main console functions.", nextScene: "intro" }
        ]
    },
    anomaly_details: {
        onEnterText: [
            "Anomaly data stream incoming: Unidentified bio-signature fluctuations and energy spikes originating from the old Terraforming Unit 7.",
            "Local AI Custodian, unit 'Terra-3', reports unusual organic growth patterns."
        ],
        description: [
            "The data stream regarding the Gamma-7 anomaly is active on your display.",
            "It highlights bio-signature spikes and energy readings from Terraforming Unit 7. Terra-3's report is also available."
        ],
        interactables: {
            "data stream": "Constantly updating sensor readings from Gamma-7. Mostly raw data, difficult to interpret directly.",
            "terra-3 report": "Unit Terra-3's report: 'Unusual flora, rapid growth, energy patterns inconsistent with known phenomena. Requesting Warden guidance.'",
            "terraforming unit 7": "Location of the anomaly. Records indicate it was decommissioned decades ago."
        },
        choices: [
            { text: "Query Terra-3 for a visual.", nextScene: "terra_3_visual" },
            { text: "Analyze energy spike signature.", nextScene: "energy_analysis" },
            { text: "Access advanced diagnostics (Requires Diagnostic Keycard).", nextScene: "advanced_diagnostics", condition: () => playerHasItem("diag_keycard") },
            { text: "Proceed to Sector Gamma-7 immediately.", nextScene: "gamma_7_arrival" }
        ],
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    advanced_diagnostics: {
        onEnterText: ["You insert the Diagnostic Keycard. Accessing deep system logs...", "The anomaly correlates with a power surge from an unauthorized geothermal tap. The bio-signatures are... adapting to it."],
        description: ["The advanced diagnostic screen shows the geothermal tap's location and the adapting bio-signatures' energy absorption patterns."],
        interactables: {
            "keycard": "The Diagnostic Keycard is currently inserted into the console.",
            "geothermal tap": "Data indicates an unregistered energy draw deep beneath Unit 7.",
            "bio-signatures": "The life forms are not only surviving but thriving on the anomalous energy."
        },
        onEnter: () => {
            gameState.firstLookInScene = true;
        },
        choices: [
            { text: "Investigate geothermal tap.", nextScene: "geothermal_investigation" },
            { text: "Focus on the adapting bio-signatures.", nextScene: "biosignature_focus" },
            { text: "Remove Diagnostic Keycard.", nextScene: "anomaly_details", onChoose: () => displayText("Diagnostic Keycard removed.", false, "system-message")}
        ]
    },
    // ... (resto de tus escenas, asegúrate de añadir 'description' y 'onEnterText' donde sea apropiado)
    system_status: {
        onEnterText: [
            "GAIA Prime Core: Optimal. Sector Stability: {sectorStability}%. AI Synchronization: {aiSync}%.",
            "No other critical alerts at this time."
        ],
        description: [
            "System status screen is active. All primary systems report green."
        ],
        interactables: {
            "core status": "GAIA Prime Core Efficiency: 100%. Last diagnostic: nominal.",
            "sector stability": "Current Sector Stability readings are at {sectorStability}%.",
            "ai synchronization": "AI Network Synchronization is at {aiSync}%."
        },
        choices: [ { text: "Back to anomaly.", nextScene: "anomaly_details" } ],
        onEnter: () => { gameState.firstLookInScene = true; }
    },
    default_end: {
        onEnterText: ["This path is still under development. The story continues soon..."],
        description: ["There's nothing more to see or do here for now."],
        choices: [{text: "Restart adventure.", nextScene: "intro"}],
        onEnter: () => { gameState.firstLookInScene = true; }
    }
    // Asegúrate de añadir más escenas para las nuevas opciones como terra_3_visual, energy_analysis etc.
    // y definirles onEnterText, description, interactables y choices.
};

// --- Inventory Functions (sin cambios) ---
function addItemToInventory(itemId, itemName) {
    if (!playerHasItem(itemId)) {
        gameState.inventory.push({ id: itemId, name: itemName });
        updateInventoryDisplay();
    }
}
function playerHasItem(itemId) {
    return gameState.inventory.some(item => item.id === itemId);
}
function updateInventoryDisplay() {
    if (!inventoryDisplay) return;
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
            li.textContent = item.name;
            li.classList.add('inventory-item');
            li.dataset.itemId = item.id;
            ul.appendChild(li);
        });
        inventoryDisplay.appendChild(ul);
    }
}

// --- Game Logic Functions ---
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
            if (processedLine[i] !== '>' || (i > 0 && processedLine[i-1] ==='<')) {
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
        await typeText(storyOutput, ["Error: Story progression lost."]);
        choicesOutput.innerHTML = '';
        return;
    }
    
    const previousSceneId = gameState.currentScene;
    gameState.currentScene = sceneId;
    if (sceneId !== previousSceneId) { // Si es una nueva escena
        gameState.firstLookInScene = true;
    }


    choicesOutput.innerHTML = '';
    choicesOutput.classList.remove('visible');

    let textToDisplay = [];
    // Decide si mostrar onEnterText o description
    if (gameState.firstLookInScene && scene.onEnterText) {
        textToDisplay = Array.isArray(scene.onEnterText) ? scene.onEnterText : [scene.onEnterText];
    } else if (scene.description) {
        textToDisplay = Array.isArray(scene.description) ? scene.description : [scene.description];
    } else if (scene.onEnterText) { // Fallback a onEnterText si no hay description
        textToDisplay = Array.isArray(scene.onEnterText) ? scene.onEnterText : [scene.onEnterText];
    } else {
        textToDisplay = ["There's nothing noteworthy here."]; // Fallback general
    }
    
    await typeText(storyOutput, textToDisplay);
    gameState.firstLookInScene = false; // Después del primer "typeo" en la escena, ya no es el firstLook

    // Mostrar Input de texto siempre
    if (playerInput) playerInput.style.display = 'block';
    if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
    // No enfocar automáticamente siempre, solo después de que el jugador haya interactuado o al inicio.
    // if (playerInput && document.activeElement !== playerInput) {
    //    setTimeout(() => playerInput.focus(), 0); 
    // }


    if (scene.choices && scene.choices.length > 0) {
        let visibleChoices = 0;
        scene.choices.forEach((choice, index) => {
            if (choice.condition && !choice.condition()) {
                return;
            }
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = processTextTemplate(choice.text);
            button.addEventListener('click', async () => { // Hacerla async
                if (gameState.isTyping) return;
                if (choice.addItem) {
                    addItemToInventory(choice.addItem.id, choice.addItem.name);
                }
                if (choice.effects) { /* ... (lógica de efectos) ... */ updateStatusDisplay(); }
                if (choice.onChoose && typeof choice.onChoose === 'function') {
                    choice.onChoose();
                }
                await renderScene(choice.nextScene); // Usar await
            });
            choicesOutput.appendChild(button);
            setTimeout(() => {
                 button.classList.add('choice-visible');
            }, visibleChoices * CHOICE_FADE_IN_DELAY_INCREMENT);
            visibleChoices++;
        });
        if (visibleChoices > 0) {
            choicesOutput.classList.add('visible');
        }
    }
    
    if (typeof scene.onEnter === 'function') {
        scene.onEnter(); // Esto puede llamar a updateStatusDisplay o addItemToInventory
    }
    updateInventoryDisplay(); // Asegura que el inventario se actualice
}

function displayText(textLine, isCommandEcho = false, type = 'normal', immediate = false) {
    const p = document.createElement('p');
    p.innerHTML = processTextTemplate(textLine);
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');
    
    storyOutput.appendChild(p);
    storyOutput.scrollTop = storyOutput.scrollHeight;

    if (immediate) { // Para mensajes que no queremos que esperen el typeo
        p.style.opacity = 1; // Asegurar que sea visible si el typeo normal lo oculta
    }
}

async function handlePlayerCommand(command) {
    if (gameState.isTyping) return;

    const lowerCommand = command.toLowerCase().trim();
    const parts = lowerCommand.split(/\s+/); // Divide el comando en partes
    const verb = parts[0];
    const target = parts.slice(1).join(" ").trim(); // El resto como objetivo

    displayText(`> ${command}`, true);

    let commandHandled = false;
    const currentSceneDef = story[gameState.currentScene];

    switch (verb) {
        case "look":
        case "mirar":
        case "examinar_sitio": // alias
            if (target === "around" || target === "" || target === "sitio" || target === "alrededor") {
                await renderScene(gameState.currentScene); // Re-renderiza la descripción principal
                commandHandled = true;
            } else if (target) { // Si es "look [algo]" o "examine [algo]" (que no sea 'around')
                // Esto ahora se manejará por el caso "examine"
                if (currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                    displayText(processTextTemplate(currentSceneDef.interactables[target]), false, 'system-message');
                    commandHandled = true;
                } else {
                    displayText("You don't see that to examine in detail here.", false, 'system-message');
                }
            }
            break;
        case "examine":
        case "x": // alias para examine
        case "inspeccionar":
            if (target && currentSceneDef.interactables && currentSceneDef.interactables[target]) {
                displayText(processTextTemplate(currentSceneDef.interactables[target]), false, 'system-message');
                commandHandled = true;
            } else if (target) {
                displayText(`You find nothing special about the ${target}.`, false, 'system-message');
                commandHandled = true;
            } else {
                displayText("Examine what?", false, 'system-message');
                commandHandled = true;
            }
            break;
        case "inventory":
        case "i":
            let inventoryTextLines = [];
            if (gameState.inventory.length === 0) {
                inventoryTextLines.push("Your inventory is empty.");
            } else {
                inventoryTextLines.push("You are carrying:");
                gameState.inventory.forEach((item) => { inventoryTextLines.push(`- ${item.name}`); });
            }
            for (const line of inventoryTextLines) { displayText(line, false, 'system-message'); }
            commandHandled = true;
            break;
        case "use":
            const itemToUseName = target.split(" on ")[0].trim(); // "use [item] on [target_object]"
            const useTargetObject = target.includes(" on ") ? target.split(" on ")[1].trim() : null;

            const itemInInventory = gameState.inventory.find(item => item.name.toLowerCase().includes(itemToUseName));
            if (itemInInventory) {
                if (currentSceneDef.itemUses && currentSceneDef.itemUses[itemInInventory.id]) {
                    const useAction = currentSceneDef.itemUses[itemInInventory.id];
                    // Comprobar si el uso requiere un objeto específico del entorno (useTargetObject)
                    if (useAction.onTarget && useTargetObject !== useAction.onTarget) {
                        displayText(`You can't use the ${itemInInventory.name} on ${useTargetObject}. Try using it on ${useAction.onTarget}.`, false, 'system-message');
                    } else if (useAction.onTarget && !useTargetObject) {
                         displayText(`What do you want to use the ${itemInInventory.name} on? (e.g., 'use ${itemInInventory.name} on ${useAction.onTarget}')`, false, 'system-message');
                    }
                    else { // Uso general o el objetivo es correcto
                        displayText(`You use the ${itemInInventory.name}...`, false, 'system-message');
                        if (useAction.textResult) displayText(processTextTemplate(useAction.textResult), false, 'system-message');
                        if (useAction.effects) { /* ... */ updateStatusDisplay(); }
                        // if (useAction.removeItem) removeItemFromInventory(itemInInventory.id); // Necesitaríamos esta función
                        if (useAction.nextScene) {
                            await renderScene(useAction.nextScene);
                            commandHandled = true; // Evita el re-renderizado de la escena actual abajo
                        }
                    }
                } else {
                    displayText(`You can't find a way to use the ${itemInInventory.name} here.`, false, 'system-message');
                }
            } else {
                displayText("You don't have that item.", false, 'system-message');
            }
            commandHandled = true;
            break;
        case "help":
        case "?":
        case "ayuda":
            const helpLines = [
                "--- Help Menu ---",
                "Available commands often include:",
                "- `look` or `look around`: Describe your current surroundings.",
                "- `examine [object]`: Get more details about an object (e.g., 'examine console').",
                "- `inventory` or `i`: Check your items.",
                "- `use [item]` or `use [item] on [object]`: Use an item from your inventory.",
                "Sometimes, specific actions will be hinted at in the text or available as buttons.",
                "------------------"
            ];
            for (const line of helpLines) { displayText(line, false, 'system-message'); }
            commandHandled = true;
            break;
        // Aquí puedes añadir más verbos como "go", "talk", "take", etc.
    }
    
    if (!commandHandled) {
         // Si no fue manejado por un verbo específico, y hay "commands" genéricos en la escena
        if (currentSceneDef.commands && currentSceneDef.commands[lowerCommand]) {
            const commandHandler = currentSceneDef.commands[lowerCommand];
            if (typeof commandHandler === 'string') {
                await renderScene(commandHandler);
            } else if (typeof commandHandler === 'function') {
                const resultScene = commandHandler(); // La función podría devolver una ID de escena
                await renderScene(resultScene || gameState.currentScene);
            }
            commandHandled = true;
        } else {
             displayText("I didn't understand that command. Type 'help' for a list of common commands.", false, 'system-message');
        }
    }

    // Re-enfocar en el input después de procesar un comando
    if (playerInput && document.activeElement !== playerInput) {
        setTimeout(() => playerInput.focus(), 0);
    }
}

function updateStatusDisplay() {
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;
    updateInventoryDisplay();
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
    const elementsToFade = [storyOutput, choicesOutput, document.getElementById('status-panel')];
    if (playerInput && playerInput.parentElement) elementsToFade.push(playerInput.parentElement);
    elementsToFade.forEach(el => { if(el) el.classList.add('initial-load-fade'); });
    
    updateStatusDisplay();
    await renderScene(gameState.currentScene); // Primera renderización
    
    // Guía inicial para el jugador
    setTimeout(() => { // Pequeño delay para que aparezca después del texto de la escena
        if (!gameState.isTyping) { // Solo si no está escribiendo ya
             displayText("Type `look around` to observe your surroundings, or `help` for commands.", false, "system-message", true);
        }
    }, (story[gameState.currentScene].onEnterText || story[gameState.currentScene].description || [""]).join("").length * TYPING_SPEED + 500);


    setTimeout(() => {
        elementsToFade.forEach(el => { if(el) el.classList.remove('initial-load-fade'); });
        if (playerInput) playerInput.focus(); // Enfocar al inicio
    }, 600);
}

// Start the game
initializeGame();
