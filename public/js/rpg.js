// public/js/rpg.js

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const choicesOutput = document.getElementById('choices-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');

// --- Game State ---
let gameState = {
    playerName: "Warden",
    currentScene: "intro",
    inventory: [],
    sectorStability: 100,
    aiSync: 100,
    isTyping: false, // Flag to prevent actions while text is typing
};

// --- Story Data (como la tenías antes, con algunas escenas de ejemplo adicionales) ---
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
        ],
        onEnter: () => {
            updateStatusDisplay();
        }
    },
    anomaly_details: {
        text: [
            "Anomaly data stream incoming: Unidentified bio-signature fluctuations and energy spikes originating from the old Terraforming Unit 7.",
            "Local AI Custodian, unit 'Terra-3', reports unusual organic growth patterns."
        ],
        choices: [
            { text: "Query Terra-3 for a visual.", nextScene: "terra_3_visual" },
            { text: "Analyze energy spike signature.", nextScene: "energy_analysis" },
            { text: "Proceed to Sector Gamma-7 immediately.", nextScene: "gamma_7_arrival" }
        ]
    },
    system_status: {
        text: [
            "GAIA Prime Core: Optimal. Sector Stability: {sectorStability}%. AI Synchronization: {aiSync}%.",
            "No other critical alerts at this time."
        ],
        choices: [
            { text: "Back to anomaly.", nextScene: "anomaly_details" }
        ]
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
            {text: "Try to get a closer look at the life signs.", nextScene: "closer_look_life_signs"},
            {text: "Proceed to the Terraforming Unit.", nextScene: "approach_unit_gamma_7"}
        ]
    },
    approach_unit_gamma_7: {
        text: ["As you get closer to the Terraforming Unit, the humming intensifies. The pulsing flora seems to react to your presence, its light patterns changing."],
        choices: [
            {text: "Interface with the unit directly.", nextScene: "interface_unit_direct"},
            {text: "Take a sample of the flora.", nextScene: "sample_flora_unit"}
        ]
    },
     observe_gamma_7: {
        text: ["You observe from a distance. The flora pulses in a synchronized rhythm. A faint, almost melodic sound can be heard emanating from the Terraforming Unit."],
        choices: [
            {text: "Attempt to record the sound.", nextScene: "record_sound_gamma_7"},
            {text: "Approach the unit.", nextScene: "approach_unit_gamma_7"}
        ]
    },
    default_end: {
        text: ["This path is still under development. The story continues soon..."],
        choices: [{text: "Restart adventure.", nextScene: "intro"}]
    }
};

// --- Game Logic Functions ---

function processTextTemplate(text) {
    return text.replace(/{playerName}/g, gameState.playerName)
               .replace(/{sectorStability}/g, gameState.sectorStability)
               .replace(/{aiSync}/g, gameState.aiSync);
}

const TYPING_SPEED = 30; // Milliseconds per character

async function typeText(element, textLines) {
    gameState.isTyping = true;
    element.innerHTML = ''; // Clear previous text

    for (const line of textLines) {
        const processedLine = processTextTemplate(line);
        const p = document.createElement('p');
        p.classList.add('story-text-line');
        element.appendChild(p);
        for (let i = 0; i < processedLine.length; i++) {
            // Use innerHTML to render tags like <span class='accent'> correctly mid-typing
            p.innerHTML = processedLine.substring(0, i + 1);
            if (processedLine[i] === '<') { // Speed through HTML tags
                const tagEnd = processedLine.indexOf('>', i);
                if (tagEnd !== -1) {
                    p.innerHTML = processedLine.substring(0, tagEnd + 1);
                    i = tagEnd; // Jump index to end of tag
                }
            }
            element.scrollTop = element.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
        }
        p.innerHTML = processedLine; // Ensure full line is rendered with HTML
        element.scrollTop = element.scrollHeight;
    }
    gameState.isTyping = false;
}

async function renderScene(sceneId, isInitialLoad = false) {
    if (gameState.isTyping) return; // Don't change scene if text is still typing out

    const scene = story[sceneId] || story['default_end'];
    if (!scene) {
        console.error(`Scene not found: ${sceneId}`);
        await typeText(storyOutput, ["Error: Story progression lost. Please contact support."]);
        choicesOutput.innerHTML = '';
        return;
    }

    // Clear choices immediately for responsiveness
    choicesOutput.innerHTML = '';
    choicesOutput.classList.remove('visible'); // Hide it for fade-in later

    // Handle text display
    let textToDisplay = [];
    if (scene.text) {
        textToDisplay = Array.isArray(scene.text) ? scene.text : [scene.text];
    }
    await typeText(storyOutput, textToDisplay);


    // Display choices after text has finished typing
    if (scene.choices && scene.choices.length > 0) {
        scene.choices.forEach(choice => {
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = processTextTemplate(choice.text);
            button.addEventListener('click', () => {
                if (gameState.isTyping) return; // Prevent action while typing
                gameState.currentScene = choice.nextScene;
                renderScene(gameState.currentScene);
            });
            choicesOutput.appendChild(button);
        });
        // Fade in choices
        // Ensure choices are visible before adding class that might trigger animation
        requestAnimationFrame(() => {
            choicesOutput.classList.add('visible');
        });

        if (playerInput) playerInput.style.display = 'none';
        if (submitCommandButton) submitCommandButton.style.display = 'none';
    } else {
        if (playerInput) playerInput.style.display = 'block';
        if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
        if (playerInput && document.activeElement !== playerInput) {
           setTimeout(() => playerInput.focus(), 0);
        }
    }

    if (typeof scene.onEnter === 'function') {
        scene.onEnter();
    }
}


// displayText for player commands or system messages (appears instantly below typed story)
function displayText(textLine, isCommandEcho = false) {
    const p = document.createElement('p');
    p.innerHTML = processTextTemplate(textLine); // Use innerHTML for potential formatting
    p.classList.add('story-text-line');
    if (isCommandEcho) {
        p.classList.add('command-echo'); // For specific styling
    }
    storyOutput.appendChild(p); // Append directly
    storyOutput.scrollTop = storyOutput.scrollHeight;
}

async function handlePlayerCommand(command) {
    if (gameState.isTyping) return; // Prevent command processing while story is typing

    const lowerCommand = command.toLowerCase().trim();
    displayText(`> ${command}`, true); // Echo command

    let sceneChangedByCommand = false;

    if (story[gameState.currentScene] && story[gameState.currentScene].commands) {
        const commandHandler = story[gameState.currentScene].commands[lowerCommand];
        if (commandHandler) {
            if (typeof commandHandler === 'string') {
                gameState.currentScene = commandHandler;
                sceneChangedByCommand = true;
            } else if (typeof commandHandler === 'function') {
                commandHandler();
                sceneChangedByCommand = true;
            }
        }
    }
    
    if (!sceneChangedByCommand) {
        let responseText;
        if (lowerCommand === "help") {
            responseText = "Try commands like 'look around', 'check status', or choose an option if presented.";
        } else if (lowerCommand === "status" || lowerCommand === "check status") {
            responseText = `Current Status: Sector Stability at ${gameState.sectorStability}%, AI Sync at ${gameState.aiSync}%.`;
        } else {
            responseText = "Command not understood in this context. Type 'help' for basic commands or choose an option.";
        }
        // Type out the game's response to the command
        await typeText(storyOutput, [...story[gameState.currentScene].text, responseText]); // Retype current scene + response
    } else {
      await renderScene(gameState.currentScene); // If command led to scene change
    }
     // Ensure input field is ready again if applicable
    if (!story[gameState.currentScene]?.choices?.length > 0 && playerInput) {
        playerInput.style.display = 'block';
        submitCommandButton.style.display = 'inline-block';
        setTimeout(() => playerInput.focus(), 0);
    }
}

function updateStatusDisplay() {
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;
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
    // Apply an initial fade-in to the main game container elements for a nice entry
    storyOutput.classList.add('initial-load-fade');
    choicesOutput.classList.add('initial-load-fade');
    if (playerInput) playerInput.parentElement.classList.add('initial-load-fade'); // Input panel
    document.getElementById('status-panel').classList.add('initial-load-fade');


    updateStatusDisplay();
    await renderScene(gameState.currentScene, true); // Pass true for isInitialLoad

    // Remove initial load fade classes after animation completes
    setTimeout(() => {
        storyOutput.classList.remove('initial-load-fade');
        choicesOutput.classList.remove('initial-load-fade');
        if (playerInput) playerInput.parentElement.classList.remove('initial-load-fade');
        document.getElementById('status-panel').classList.remove('initial-load-fade');
    }, 600); // Should match or exceed the initial-load-fade animation duration
}

// Start the game
initializeGame();
