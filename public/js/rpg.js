// public/js/rpg.js

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const choicesOutput = document.getElementById('choices-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
// Status panel elements
const playerNameDisplay = document.getElementById('player-name');
const sectorStabilityDisplay = document.getElementById('sector-stability');
const aiSyncDisplay = document.getElementById('ai-sync');

// --- Game State (Simple Example) ---
let gameState = {
    playerName: "Warden",
    currentScene: "intro",
    inventory: [],
    sectorStability: 100, // Percentage
    aiSync: 100, // Percentage
};

// --- Story Data (More complex structure can be used) ---
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
            { text: "Back to anomaly.", nextScene: "anomaly_details" } // Changed from intro to anomaly_details for better flow
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
        // This scene would likely use text input commands rather than fixed choices
        commands: { // Example for text input later
            "scan area": "scan_gamma_7_area",
            "approach terraforming unit": "approach_unit_gamma_7"
        },
        choices: [ // Fallback choices if command input isn't primary yet
             {text: "Scan the immediate area.", nextScene: "scan_gamma_7_area"},
             {text: "Cautiously approach the Terraforming Unit.", nextScene: "approach_unit_gamma_7"},
             {text: "Stay put and observe.", nextScene: "observe_gamma_7"}
        ]
    },
    // ... more scenes for new choices
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

async function renderScene(sceneId) {
    const scene = story[sceneId] || story['default_end'];
    if (!scene) {
        console.error(`Scene not found: ${sceneId}`);
        storyOutput.innerHTML = '<p class="story-text-line">Error: Story progression lost. Please contact support.</p>';
        choicesOutput.innerHTML = '';
        return;
    }

    // 1. Start fade-out if content exists
    if (storyOutput.hasChildNodes() || choicesOutput.hasChildNodes()) {
        storyOutput.classList.add('fade-out-active');
        choicesOutput.classList.add('fade-out-active');
        await new Promise(resolve => setTimeout(resolve, 250)); // Matches CSS transition time
    }

    // 2. Clear old content
    storyOutput.innerHTML = '';
    choicesOutput.innerHTML = '';

    // 3. Display new scene text
    if (scene.text && Array.isArray(scene.text)) {
        scene.text.forEach((line) => { // Removed index for staggered animation for block fade
            const processedLine = processTextTemplate(line);
            const p = document.createElement('p');
            p.innerHTML = processedLine;
            p.classList.add('story-text-line'); // Kept for styling if needed
            storyOutput.appendChild(p);
        });
    } else if (scene.text) {
        const p = document.createElement('p');
        p.innerHTML = processTextTemplate(scene.text);
        p.classList.add('story-text-line');
        storyOutput.appendChild(p);
    }
    storyOutput.scrollTop = storyOutput.scrollHeight;

    // 4. Display new choices
    if (scene.choices && scene.choices.length > 0) {
        scene.choices.forEach(choice => {
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = processTextTemplate(choice.text);
            button.addEventListener('click', () => {
                if (storyOutput.classList.contains('fade-out-active')) return; // Prevent clicks during transition
                gameState.currentScene = choice.nextScene;
                renderScene(gameState.currentScene);
            });
            choicesOutput.appendChild(button);
        });
        if (playerInput) playerInput.style.display = 'none';
        if (submitCommandButton) submitCommandButton.style.display = 'none';
    } else {
        if (playerInput) playerInput.style.display = 'block';
        if (submitCommandButton) submitCommandButton.style.display = 'inline-block';
        if (playerInput && document.activeElement !== playerInput) {
            setTimeout(() => playerInput.focus(), 0); // Focus after current processing
        }
    }

    // 5. Trigger fade-in
    storyOutput.classList.remove('fade-out-active'); // Remove before adding fade-in
    choicesOutput.classList.remove('fade-out-active');

    // Force reflow might not be strictly necessary with opacity, but good to know
    // void storyOutput.offsetWidth;
    // void choicesOutput.offsetWidth;

    storyOutput.classList.add('fade-in-active');
    choicesOutput.classList.add('fade-in-active');

    // 6. Clean up fade-in class
    setTimeout(() => {
        storyOutput.classList.remove('fade-in-active');
        choicesOutput.classList.remove('fade-in-active');
    }, 300); // Duration of fade + a little buffer

    if (typeof scene.onEnter === 'function') {
        scene.onEnter();
    }
}

function processTextTemplate(text) {
    return text.replace(/{playerName}/g, gameState.playerName)
               .replace(/{sectorStability}/g, gameState.sectorStability)
               .replace(/{aiSync}/g, gameState.aiSync);
}

// displayText is mostly used for echoing commands or simple system messages
// that might not need the full fade-out/fade-in of the main story block.
// If you want these to also participate in the fade, they'd need to be integrated
// into the renderScene's text array.
function displayText(textLine) {
    const p = document.createElement('p');
    p.innerHTML = processTextTemplate(textLine);
    p.classList.add('story-text-line'); // For styling
    if (textLine.startsWith('&gt;')) { // Style player commands differently if desired
        p.style.color = 'var(--color-text-muted)'; // Example
        p.style.fontStyle = 'italic';
    }
    storyOutput.appendChild(p);
    storyOutput.scrollTop = storyOutput.scrollHeight;
}

async function handlePlayerCommand(command) {
    const lowerCommand = command.toLowerCase().trim();
    displayText(`> ${command}`); // Echo command

    let sceneChangedByCommand = false;

    if (story[gameState.currentScene] && story[gameState.currentScene].commands) {
        const commandHandler = story[gameState.currentScene].commands[lowerCommand];
        if (commandHandler) {
            if (typeof commandHandler === 'string') {
                gameState.currentScene = commandHandler;
                sceneChangedByCommand = true;
            } else if (typeof commandHandler === 'function') {
                // Assume function might change scene or perform action then wants rerender
                commandHandler(); // This function might set gameState.currentScene
                sceneChangedByCommand = true; // Assume it does, or needs a refresh
            }
        }
    }
    
    if (!sceneChangedByCommand) { // If command didn't lead to a defined scene change
        if (lowerCommand === "help") {
            displayText("Try commands like 'look around', 'check status', or choose an option if presented.");
        } else if (lowerCommand === "status" || lowerCommand === "check status") {
            displayText(`Current Status: Sector Stability at ${gameState.sectorStability}%, AI Sync at ${gameState.aiSync}%.`);
        } else {
            displayText("Command not understood in this context. Type 'help' for basic commands or choose an option.");
        }
    }
    
    // Always re-render. If scene changed, it shows new scene. If not, it refreshes current (e.g., to show input field again).
    await renderScene(gameState.currentScene);
}

function updateStatusDisplay() {
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;
}

// --- Event Listeners ---
if (submitCommandButton) {
    submitCommandButton.addEventListener('click', async () => {
        const command = playerInput.value;
        if (command && !storyOutput.classList.contains('fade-out-active')) { // Prevent input during transition
            playerInput.value = '';
            await handlePlayerCommand(command);
        }
    });
}

if (playerInput) {
    playerInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            const command = playerInput.value;
            if (command && !storyOutput.classList.contains('fade-out-active')) { // Prevent input during transition
                playerInput.value = '';
                await handlePlayerCommand(command);
            }
        }
    });
}

// Theme toggle
const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        alert('Theme toggle clicked! Implement theme switching logic here.');
    });
}

// --- Initial Game Setup ---
async function initializeGame() {
    updateStatusDisplay();
    // Initial render, no fade-out needed as it's the first load
    storyOutput.classList.add('fade-in-active'); // Start visible
    choicesOutput.classList.add('fade-in-active'); // Start visible
    await renderScene(gameState.currentScene); // Call the async version
    
    setTimeout(() => { // Clean up initial fade-in classes
        storyOutput.classList.remove('fade-in-active');
        choicesOutput.classList.remove('fade-in-active');
    }, 300);
}

// Start the game when the script loads
initializeGame();
