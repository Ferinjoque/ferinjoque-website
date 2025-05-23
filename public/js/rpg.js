// public/js/rpg.js

// --- DOM Elements ---
const storyOutput = document.getElementById('story-output');
const choicesOutput = document.getElementById('choices-output');
const playerInput = document.getElementById('player-input');
const submitCommandButton = document.getElementById('submit-command');
// Status panel elements (optional for now, can be updated later)
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
            // Actions to take when entering this scene, e.g., update status
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
            { text: "Back to anomaly.", nextScene: "intro" } // Or anomaly_details
        ]
    },
    // ... more scenes
    default_end: {
        text: ["This path is still under development. The story continues soon..."],
        choices: [{text: "Restart adventure.", nextScene: "intro"}]
    }
};

// --- Game Logic Functions ---

function renderScene(sceneId) {
    const scene = story[sceneId] || story['default_end'];
    if (!scene) {
        console.error(`Scene not found: ${sceneId}`);
        displayText("Error: Story progression lost. Please contact support.");
        return;
    }

    // Clear previous story text and choices
    storyOutput.innerHTML = '';
    choicesOutput.innerHTML = '';

    // Display scene text with templating
    if (scene.text && Array.isArray(scene.text)) {
        scene.text.forEach((line, index) => {
            const processedLine = processTextTemplate(line);
            const p = document.createElement('p');
            p.innerHTML = processedLine; // Use innerHTML to allow span tags
            p.classList.add('story-text-line');
            p.style.animationDelay = `${index * 0.3}s`; // Stagger animation
            storyOutput.appendChild(p);
        });
    } else if (scene.text) {
        displayText(processTextTemplate(scene.text));
    }
    
    storyOutput.scrollTop = storyOutput.scrollHeight; // Scroll to bottom

    // Display choices as buttons
    if (scene.choices && scene.choices.length > 0) {
        scene.choices.forEach(choice => {
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = processTextTemplate(choice.text);
            button.addEventListener('click', () => {
                gameState.currentScene = choice.nextScene;
                renderScene(gameState.currentScene);
            });
            choicesOutput.appendChild(button);
        });
        playerInput.style.display = 'none'; // Hide text input if choices are present
        submitCommandButton.style.display = 'none';
    } else {
        playerInput.style.display = 'block'; // Show text input if no choices
        submitCommandButton.style.display = 'inline-block';
        playerInput.focus();
    }

    // Execute onEnter function if it exists
    if (typeof scene.onEnter === 'function') {
        scene.onEnter();
    }
}

function processTextTemplate(text) {
    return text.replace(/{playerName}/g, gameState.playerName)
               .replace(/{sectorStability}/g, gameState.sectorStability)
               .replace(/{aiSync}/g, gameState.aiSync);
}

function displayText(textLine) {
    const p = document.createElement('p');
    p.innerHTML = processTextTemplate(textLine); // Use innerHTML for potential formatting
    p.classList.add('story-text-line');
    storyOutput.appendChild(p);
    storyOutput.scrollTop = storyOutput.scrollHeight;
}

function handlePlayerCommand(command) {
    const lowerCommand = command.toLowerCase().trim();
    displayText(`> ${command}`); // Echo command

    // Simple command parsing (can be expanded significantly)
    if (story[gameState.currentScene] && story[gameState.currentScene].commands) {
        const commandHandler = story[gameState.currentScene].commands[lowerCommand];
        if (commandHandler) {
            if (typeof commandHandler === 'string') { // Direct scene transition
                gameState.currentScene = commandHandler;
            } else if (typeof commandHandler === 'function') { // Function to execute
                commandHandler();
            }
            renderScene(gameState.currentScene);
            return;
        }
    }
    
    // Default response for unknown commands or if no choices/commands defined
    if (lowerCommand === "help") {
        displayText("Try commands like 'look around', 'check status', or choose an option if presented.");
    } else if (lowerCommand === "status" || lowerCommand === "check status") {
        displayText(`Current Status: Sector Stability at ${gameState.sectorStability}%, AI Sync at ${gameState.aiSync}%.`);
    }
    else {
        displayText("Command not understood in this context. Type 'help' for basic commands or choose an option.");
    }
    // Ensure the scene is re-rendered to potentially show input again if it was hidden
    renderScene(gameState.currentScene); 
}

function updateStatusDisplay() {
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName;
    if (sectorStabilityDisplay) sectorStabilityDisplay.textContent = `${gameState.sectorStability}%`;
    if (aiSyncDisplay) aiSyncDisplay.textContent = `${gameState.aiSync}%`;
}

// --- Event Listeners ---
submitCommandButton.addEventListener('click', () => {
    const command = playerInput.value;
    if (command) {
        handlePlayerCommand(command);
        playerInput.value = '';
    }
});

playerInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const command = playerInput.value;
        if (command) {
            handlePlayerCommand(command);
            playerInput.value = '';
        }
    }
});

// Theme toggle (copied from your main.js logic, adapt if needed)
const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        // Simple alert for now, you can implement actual theme switching
        // or tie it into your existing theme logic if it's global.
        alert('Theme toggle clicked! Implement theme switching logic here.');
        // Example: document.body.classList.toggle('light-theme'); 
        // Ensure your CSS supports .light-theme for RPG elements
    });
}


// --- Initial Game Setup ---
function initializeGame() {
    // Potentially ask for player name or load saved game in the future
    // gameState.playerName = prompt("Enter your Warden designation:") || "Warden";
    updateStatusDisplay();
    renderScene(gameState.currentScene);
}

// Start the game when the script loads
initializeGame();
