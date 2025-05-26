// public/js/rpg.js - Phase 1 & Phase 2 (Auth) Improvements

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
const helpContent = document.getElementById('help-modal-content'); //
const closeHelpButton = document.getElementById('close-help-modal');
const aiChoicesPanel = document.getElementById('ai-choices-panel');
const aiLoadingIndicator = document.getElementById('ai-loading-indicator');
let processingMessageElement = null;

// --- Auth UI DOM Elements ---
const authUiContainer = document.getElementById('auth-ui-container');
const gameUiContainer = document.getElementById('game-ui-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const playGuestButton = document.getElementById('play-guest-button');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const userStatusArea = document.getElementById('user-status-area');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutButton = document.getElementById('logout-button');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');

// --- Game State ---
let gameState = {
    playerName: "Warden", //
    inventory: [], //
    sectorStability: 100, //
    aiSync: 100,          //
    currentLocationDescription: "at the GAIA Prime main console.", //
    turnHistory: [],      //
    isAwaitingAI: false,  //
    currentUser: null,    // Will store Supabase user object
};

// --- Command History ---
let commandHistory = [];
let historyIndex = -1;

// --- Supabase Client Initialization ---
const SUPABASE_PROJECT_URL = 'https://sueybbrfwiqviollreiu.supabase.co'; // <<<<<<< REPLACE THIS
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZXliYnJmd2lxdmlvbGxyZWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTc0ODIsImV4cCI6MjA2MTg5MzQ4Mn0.7_gmmA5Ra1b43BOQ83pr7SZ0lTGjaemYaebkYSm99pw';    // <<<<<<< REPLACE THIS
let supabase = null;

if (SUPABASE_PROJECT_URL === 'https://sueybbrfwiqviollreiu.supabase.co' || SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZXliYnJmd2lxdmlvbGxyZWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTc0ODIsImV4cCI6MjA2MTg5MzQ4Mn0.7_gmmA5Ra1b43BOQ83pr7SZ0lTGjaemYaebkYSm99pw') {
    console.error("CRITICAL: Supabase URL or Anon Key is not configured. Please update rpg.js");
    // Display a visible error on the page if these are not set
    const body = document.querySelector('body');
    if (body) {
        body.innerHTML = '<p style="color: white; text-align: center; padding: 50px; font-size: 1.2em;">Eco-Echoes is currently unavailable due to a configuration error. Please try again later.</p>';
    }
} else {
    try {
        supabase = supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Error initializing Supabase client:", e);
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<p style="color: white; text-align: center; padding: 50px; font-size: 1.2em;">Critical error: Could not initialize application services. Please try again later.</p>';
        }
    }
}


// --- Core Game Functions ---

function escapeHtml(unsafe) { //
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function highlightKeywordsInHtml(htmlLine) { //
    const commandableKeywordRegex = /\b(look|examine|use|take|go|inventory|help|status|search|talk|ask|open|north|south|east|west|up|down|console|alert|datapad|keycard|terminal|report|engine|anomaly|power|system|filter|recycle|waste|energy|flora|fauna|reactor|ai core|warden|gaia|terra-3)\b(?![^<]*>|[^<>]*<\/span>)/gi;
    return htmlLine.replace(commandableKeywordRegex, (match) => `<span class="commandable-keyword">${match}</span>`);
}

async function typeText(text, isCommandEcho = false, type = 'normal') {
    if (!storyOutput) return; // Guard against missing element
    const p = document.createElement('p');
    p.classList.add('story-text-line');
    if (isCommandEcho) p.classList.add('command-echo');
    if (type === 'system-message') p.classList.add('system-message');
    if (type === 'error-message') p.classList.add('error-message');

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
        if (TYPING_SPEED > 0 && !isCommandEcho && type !== 'system-message' && type !== 'error-message') {
            await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
        }
    }
    p.innerHTML = processedText; 
    storyOutput.scrollTop = storyOutput.scrollHeight;
}

function updateStatusDisplay() {
    const nameToDisplay = gameState.currentUser ? (gameState.currentUser.email.split('@')[0] || "Warden") : (gameState.playerName || "Warden (Guest)");
    if (playerNameDisplay) playerNameDisplay.textContent = nameToDisplay;
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
    if (!aiChoicesPanel) return;
    aiChoicesPanel.innerHTML = '';
    if (choices && choices.length > 0) {
        choices.forEach(choiceText => {
            if (typeof choiceText !== 'string' || choiceText.trim() === '') return;
            const button = document.createElement('button');
            button.classList.add('ai-choice-button');
            button.textContent = escapeHtml(choiceText);
            button.addEventListener('click', () => {
                if (gameState.isAwaitingAI || !playerInput) return;
                playerInput.value = choiceText; 
                if (submitCommandButton) submitCommandButton.click();    
                aiChoicesPanel.innerHTML = '';  
            });
            aiChoicesPanel.appendChild(button);
        });
    }
}

function showProcessingMessage(show) {
    if (!storyOutput) return;
    if (show) {
        if (!processingMessageElement) {
            processingMessageElement = document.createElement('p');
            processingMessageElement.classList.add('system-message', 'processing-indicator-text');
            processingMessageElement.textContent = "GAIA Prime is processing your command...";
            
            const staticIndicatorText = storyOutput.querySelector('.processing-indicator-text-static');
            if(staticIndicatorText) staticIndicatorText.style.display = 'block'; // Show static if present

            if(aiLoadingIndicator && aiLoadingIndicator.parentNode === storyOutput) {
                 storyOutput.insertBefore(processingMessageElement, aiLoadingIndicator);
            } else if (aiLoadingIndicator) { // If indicator is separate, just append to story
                storyOutput.appendChild(processingMessageElement);
            } else { // Fallback if no spinner element
                storyOutput.appendChild(processingMessageElement);
            }
        }
        processingMessageElement.style.display = 'block';
        if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'flex';
        storyOutput.scrollTop = storyOutput.scrollHeight;
    } else {
        if (processingMessageElement) {
            processingMessageElement.style.display = 'none';
        }
        const staticIndicatorText = storyOutput.querySelector('.processing-indicator-text-static');
        if(staticIndicatorText) staticIndicatorText.style.display = 'none';

        if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'none';
    }
}

async function callAIEngine(playerCommand) {
    if (gameState.isAwaitingAI) {
        console.warn("AI call already in progress.");
        return;
    }
    gameState.isAwaitingAI = true;
    showProcessingMessage(true);
    if(aiChoicesPanel) aiChoicesPanel.innerHTML = ''; 

    const promptPayload = {
        currentGameState: {
            playerName: gameState.playerName,
            inventory: gameState.inventory.map(item => (typeof item === 'string' ? item : item.name)),
            sectorStability: gameState.sectorStability,
            aiSync: gameState.aiSync,
            currentLocationDescription: gameState.currentLocationDescription,
        },
        playerCommand: playerCommand,
        turnHistory: gameState.turnHistory, 
        gameTheme: "The game explores AI ethics and environmental sustainability in a sci-fi setting. The player is a Warden interacting with GAIA Prime, the planetary AI. Focus on descriptive text, player agency, and thematic challenges related to ecological balance or AI decisions." //
    };

    try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                 // If you implement user-specific calls later, add Authorization header:
                 // 'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
            },
            body: JSON.stringify(promptPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "AI engine request failed with status: " + response.status, details: `Status: ${response.status}` }));
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
                    gameState.inventory.push({ name: itemName });
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
        if(playerInput) playerInput.focus();
    }
}

async function handlePlayerCommand() {
    if (!playerInput || !storyOutput) return; // Ensure elements exist
    const originalCommandText = playerInput.value.trim();
    if (!originalCommandText || gameState.isAwaitingAI) {
        playerInput.focus();
        return;
    }
    
    commandHistory.push(originalCommandText);
    if (commandHistory.length > COMMAND_HISTORY_MAX) {
        commandHistory.shift();
    }
    historyIndex = commandHistory.length;

    playerInput.value = ''; 
    let processedCommand = originalCommandText.toLowerCase(); 

    if (commandAliases[processedCommand]) {
        processedCommand = commandAliases[processedCommand];
        await typeText(`> ${escapeHtml(originalCommandText)} (${escapeHtml(processedCommand)})`, true);
    } else {
        await typeText(`> ${escapeHtml(originalCommandText)}`, true);
    }

    if (processedCommand === "help") {
        showHelpModal();
        playerInput.focus();
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
     if (processedCommand === "quit" && gameState.currentUser === null) { // Only allow quit for guests this way for now
        await typeText("Exiting guest session. Your progress is not saved.", false, 'system-message');
        if(storyOutput) storyOutput.innerHTML += '<p class="system-message">Return to the main screen to log in or start a new guest session.</p>';
        if(playerInput) playerInput.disabled = true;
        if(submitCommandButton) submitCommandButton.disabled = true;
        if (logoutButton) logoutButton.textContent = "Back to Menu"; // Change button to reflect state
        return;
    }


    await callAIEngine(processedCommand);
}

// --- Help Modal ---
function showHelpModal() {
    if (!helpModal || !helpContent) return;
    helpModal.style.display = 'flex';
}

function closeHelpModalFunc() {
    if (helpModal) helpModal.style.display = 'none';
    if (playerInput) playerInput.focus();
}

// --- Auth Functions ---
async function handleRegistration(event) {
    event.preventDefault();
    if (!supabase || !registerForm || !registerMessage) return;
    const emailInput = registerForm.querySelector('#register-email');
    const passwordInput = registerForm.querySelector('#register-password');
    if(!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    
    registerMessage.textContent = 'Registering...';
    registerMessage.className = 'auth-message';

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        registerMessage.textContent = `Registration failed: ${error.message}`;
        registerMessage.classList.add('error');
    } else if (data.user && data.user.identities && data.user.identities.length === 0 && !data.session) {
        // This case means email confirmation is likely required by Supabase settings
        registerMessage.textContent = 'Registration successful! Please check your email to confirm your account.';
        registerMessage.classList.add('success');
        toggleAuthForms(true); 
    } else if (data.user && data.session) {
        // User signed up and is immediately logged in (e.g. auto-confirm is on, or email confirmation off)
        registerMessage.textContent = 'Registration successful! You are now logged in.';
        registerMessage.classList.add('success');
        await setupUserSession(data.user, data.session);
    } else if (data.user && !data.session) {
         // User exists, but no session -> means email confirmation is required and not yet done
        registerMessage.textContent = 'Registration successful! Please check your email to complete setup.';
        registerMessage.classList.add('success');
        toggleAuthForms(true); // Show login, prompt them to confirm.
    }
     else {
        registerMessage.textContent = 'Registration successful! Please check your email to confirm your account if required.';
        registerMessage.classList.add('success');
        toggleAuthForms(true);
    }
    console.log('Registration attempt data:', data);
    console.log('Registration attempt error:', error);
}

async function handleLogin(event) {
    event.preventDefault();
    if (!supabase || !loginForm || !loginMessage) return;
    const emailInput = loginForm.querySelector('#login-email');
    const passwordInput = loginForm.querySelector('#login-password');
    if(!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    loginMessage.textContent = 'Logging in...';
    loginMessage.className = 'auth-message';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        loginMessage.textContent = `Login failed: ${error.message}`;
        loginMessage.classList.add('error');
    } else if (data.user && data.session) {
        loginMessage.textContent = 'Login successful!';
        loginMessage.classList.add('success');
        await setupUserSession(data.user, data.session);
    } else {
        loginMessage.textContent = 'Login failed. Please check your credentials or confirm your email if new.';
        loginMessage.classList.add('error');
    }
    console.log('Login attempt data:', data);
    console.log('Login attempt error:', error);
}

async function handleLogout() {
    if (!supabase) {
        console.error('Supabase client not available for logout.');
        return;
    }
    gameState.isAwaitingAI = true; 
    if(playerInput) playerInput.disabled = true;
    if(submitCommandButton) submitCommandButton.disabled = true;

    const { error } = await supabase.auth.signOut();
    
    gameState.isAwaitingAI = false;
    // Re-enable regardless of error, as the app state changes to auth UI
    if(playerInput) playerInput.disabled = false; 
    if(submitCommandButton) submitCommandButton.disabled = false;


    if (error) {
        console.error('Error logging out:', error);
        if (userStatusArea) { // Display error briefly if possible
            userStatusArea.innerHTML += `<span style="color:red; font-size:0.8em;"> Logout failed.</span>`;
            setTimeout(()=> updateTopUserStatus(), 3000);
        }
    } else {
        console.log('User logged out.');
    }
    // Regardless of error, reset to auth UI
    gameState.currentUser = null;
    resetGameState(); 
    showAuthUI();
    if (logoutButton) logoutButton.textContent = "Logout"; // Reset button text
}

function playAsGuest() {
    console.log('Playing as guest.');
    gameState.currentUser = null; 
    resetGameState(); 
    updateTopUserStatus(); // Update top bar for guest
    showGameUI();
    startGameLogic(); 
}

async function setupUserSession(user, session) {
    console.log('Setting up user session for:', user.email);
    gameState.currentUser = user; 
    
    // TODO LATER: Load saved game state for this user
    resetGameState(); 
    gameState.playerName = user.email.split('@')[0] || "Warden"; // Use part of email as name
    updateTopUserStatus();
    showGameUI();
    await startGameLogic();
}

function showAuthUI() {
    if (authUiContainer) authUiContainer.style.display = 'flex';
    if (gameUiContainer) gameUiContainer.style.display = 'none';
    if (userStatusArea) userStatusArea.style.display = 'none';
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    if (loginMessage) loginMessage.textContent = '';
    if (registerMessage) registerMessage.textContent = '';
    toggleAuthForms(true); // Default to showing login form
}

function showGameUI() {
    if (authUiContainer) authUiContainer.style.display = 'none';
    if (gameUiContainer) gameUiContainer.style.display = 'flex';
    updateTopUserStatus(); // Ensure user status area is correctly shown/hidden
}

function toggleAuthForms(showLogin) {
    const loginP = showLoginLink?.parentElement;
    const registerP = showRegisterLink?.parentElement;

    if (showLogin) {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (loginP) loginP.style.display = 'none';
        if (registerP) registerP.style.display = 'block';
    } else { 
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (loginP) loginP.style.display = 'block';
        if (registerP) registerP.style.display = 'none';
    }
}

function updateTopUserStatus() {
    if (!userStatusArea || !userEmailDisplay || !logoutButton) return;

    if (gameState.currentUser) {
        userEmailDisplay.textContent = gameState.currentUser.email;
        logoutButton.textContent = "Logout";
        userStatusArea.style.display = 'flex';
    } else { // Guest or logged out
        userEmailDisplay.textContent = "Guest";
        logoutButton.textContent = "Exit Guest Session"; // Or "Back to Menu"
        userStatusArea.style.display = 'flex'; // Show for guests too
    }
}

function resetGameState() {
    console.log("Resetting game state.");
    gameState.inventory = [];
    gameState.sectorStability = 100;
    gameState.aiSync = 100;
    gameState.currentLocationDescription = "at the GAIA Prime main console.";
    gameState.turnHistory = [];
    gameState.isAwaitingAI = false; 
    
    gameState.playerName = gameState.currentUser ? (gameState.currentUser.email.split('@')[0] || "Warden") : "Warden (Guest)";
    
    if(storyOutput) storyOutput.innerHTML = ''; // Clear story for new game
    if(aiChoicesPanel) aiChoicesPanel.innerHTML = '';
    if(playerInput) {
        playerInput.value = '';
        playerInput.disabled = false;
    }
    if(submitCommandButton) submitCommandButton.disabled = false;
    showProcessingMessage(false); // Ensure processing message is hidden
    updateStatusDisplay();
}

async function startGameLogic() {
    if (!storyOutput || !playerInput) {
        console.error("Cannot start game logic, essential UI elements missing.");
        return;
    }
    playerInput.disabled = false;
    if(submitCommandButton) submitCommandButton.disabled = false;

    resetGameState(); // Call reset at the beginning of a new game session
    updateStatusDisplay(); // Update display with potentially new player name

    await typeText("Initializing GAIA Prime interface...", false, 'system-message');
    await callAIEngine("##START_GAME##");

    console.log("Eco-Echoes AI RPG Game Logic Initialized.");
    playerInput.focus();
}

// --- App Initialization ---
function initializeApp() {
    console.log("Eco-Echoes App Initializing...");
    if (!supabase) {
        console.error("Supabase client not initialized. Cannot proceed with app initialization.");
        if (authUiContainer) {
            authUiContainer.innerHTML = "<div class='auth-panel'><p class='auth-message error'>Eco-Echoes is currently unavailable. Please try again later.</p></div>";
            authUiContainer.style.display = 'flex';
        }
        if (gameUiContainer) gameUiContainer.style.display = 'none';
        return; 
    }

    // --- Setup Static Event Listeners (once) ---
    if (loginForm && !loginForm.dataset.listener) {
        loginForm.addEventListener('submit', handleLogin);
        loginForm.dataset.listener = "true";
    }
    if (registerForm && !registerForm.dataset.listener) {
        registerForm.addEventListener('submit', handleRegistration);
        registerForm.dataset.listener = "true";
    }
    if (playGuestButton && !playGuestButton.dataset.listener) {
        playGuestButton.addEventListener('click', playAsGuest);
        playGuestButton.dataset.listener = "true";
    }
    if (logoutButton && !logoutButton.dataset.listener) {
        logoutButton.addEventListener('click', handleLogout);
        logoutButton.dataset.listener = "true";
    }
    if (showRegisterLink && !showRegisterLink.dataset.listener) {
        showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(false); });
        showRegisterLink.dataset.listener = "true";
    }
    if (showLoginLink && !showLoginLink.dataset.listener) {
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(true); });
        showLoginLink.dataset.listener = "true";
    }
    if (closeHelpButton && !closeHelpButton.dataset.listener) {
        closeHelpButton.addEventListener('click', closeHelpModalFunc);
        closeHelpButton.dataset.listener = "true";
    }
    if (helpModal && !helpModal.dataset.listener) {
        helpModal.addEventListener('click', (event) => {
            if (event.target === helpModal) closeHelpModalFunc();
        });
        helpModal.dataset.listener = "true";
    }
    if (submitCommandButton && !submitCommandButton.dataset.listener) {
        submitCommandButton.addEventListener('click', handlePlayerCommand);
        submitCommandButton.dataset.listener = "true";
    }
    if (playerInput && !playerInput.dataset.listener) {
        playerInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handlePlayerCommand();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (commandHistory.length > 0 && historyIndex > 0) {
                    historyIndex--;
                    playerInput.value = commandHistory[historyIndex];
                    playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                } else if (commandHistory.length > 0 && historyIndex === 0) {
                    // Optional: Allow cycling to the last command if at the first and press up again
                     playerInput.value = commandHistory[historyIndex]; // keep first command
                     playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    playerInput.value = commandHistory[historyIndex];
                    playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                } else if (historyIndex === commandHistory.length - 1 && commandHistory.length > 0) {
                     historyIndex = commandHistory.length; 
                     playerInput.value = ""; 
                }
            }
        });
        playerInput.dataset.listener = "true";
    }
    // --- End Static Event Listeners ---

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            console.log("Found active session on load:", session);
            setupUserSession(session.user, session);
        } else {
            console.log("No active session found on load.");
            showAuthUI();
        }
    }).catch(error => {
        console.error("Error getting initial session:", error);
        showAuthUI();
    });

    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            gameState.currentUser = null;
            if(gameUiContainer && gameUiContainer.style.display !== 'none') { // only if game was active
                if(storyOutput) storyOutput.innerHTML = '<p class="system-message">You have been logged out. Come back soon!</p>';
                if(playerInput) playerInput.disabled = true;
                if(submitCommandButton) submitCommandButton.disabled = true;
            }
            resetGameState(); // Full reset
            showAuthUI();
        } else if (event === 'SIGNED_IN') {
            if (session && session.user) {
                // Avoid re-initializing if already handled by getSession or if user is same
                if (!gameState.currentUser || gameState.currentUser.id !== session.user.id) {
                    setupUserSession(session.user, session);
                }
            }
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
             if (session && session.user && gameState.currentUser && gameState.currentUser.id === session.user.id) {
                console.log("Session refreshed or user updated for current user.");
                gameState.currentUser = session.user; // Update with potentially new metadata
                updateTopUserStatus(); // Refresh display if email/name changed
            } else if (session && session.user && (!gameState.currentUser || gameState.currentUser.id !== session.user.id)) {
                // This case could happen if a user was logged out and then a new session for a different user is detected
                console.log("New user session detected after token refresh/update event.");
                setupUserSession(session.user, session);
            }
        }
    });
    document.querySelectorAll('.initial-load-fade').forEach(el => el.classList.remove('initial-load-fade')); //
}

// Start the application
initializeApp();
