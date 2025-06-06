// --- Constants ---
const TYPING_SPEED = 5;
const MAX_HISTORY_TURNS = 5;
const COMMAND_HISTORY_MAX = 20;
const SUPABASE_FUNCTION_URL = `https://sueybbrfwiqviollreiu.supabase.co/functions/v1/rpg-ai-engine/`;

const commandAliases = {
    "l": "look around",
    "i": "inventory",
    "inv": "inventory",
    "h": "help",
    "?": "help",
    "q": "quit"
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
let processingMessageElement = null;
const loginPasswordInput = document.getElementById('login-password');
const toggleLoginPasswordIcon = document.getElementById('toggle-login-password');
const registerPasswordInput = document.getElementById('register-password');
const toggleRegisterPasswordIcon = document.getElementById('toggle-register-password');

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
    playerName: "Warden",
    inventory: [],
    sectorStability: 100,
    aiSync: 100,
    currentLocationDescription: "at the GAIA Prime main console.",
    turnHistory: [],
    isAwaitingAI: false,
    currentUser: null,
};

// --- Command History ---
let commandHistory = [];
let historyIndex = -1;

// --- Supabase Client Initialization ---
const SUPABASE_PROJECT_URL = 'https://sueybbrfwiqviollreiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZXliYnJmd2lxdmlvbGxyZWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTc0ODIsImV4cCI6MjA2MTg5MzQ4Mn0.7_gmmA5Ra1b43BOQ83pr7SZ0lTGjaemYaebkYSm99pw';
let supabase = null;

try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
    } else {
        throw new Error("Supabase client library (supabase-js) not found. Ensure it's loaded before this script, typically via a CDN link in your HTML: <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script>");
    }
} catch (e) {
    console.error("Error initializing Supabase client:", e);
    const body = document.querySelector('body');
    if (body && authUiContainer) {
         authUiContainer.innerHTML = "<div class='auth-panel'><p class='auth-message error'>Critical error: Could not initialize application services. This might be due to an issue with the Supabase client library or invalid credentials. Check console for details.</p></div>";
         authUiContainer.style.display = 'flex';
         if(gameUiContainer) gameUiContainer.style.display = 'none';
    } else if (body) {
        body.innerHTML = '<p style="color: white; text-align: center; padding: 50px; font-size: 1.2em;">Critical error: Could not initialize application services. Check console for details.</p>';
    }
}

// --- Core Game Functions ---
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
    const commandableKeywordRegex = /\b(look|examine|use|take|go|inventory|help|status|search|talk|ask|open|north|south|east|west|up|down|console|alert|datapad|keycard|terminal|report|engine|anomaly|power|system|filter|recycle|waste|energy|flora|fauna|reactor|ai core|warden|gaia|terra-3)\b(?![^<]*>|[^<>]*<\/span>)/gi;
    return htmlLine.replace(commandableKeywordRegex, (match) => `<span class="commandable-keyword">${match}</span>`);
}

async function typeText(text, isCommandEcho = false, type = 'normal') {
    if (!storyOutput) return;
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
    const staticIndicatorText = storyOutput.querySelector('.processing-indicator-text-static');

    if (show) {
        if (!processingMessageElement) {
            processingMessageElement = document.createElement('p');
            processingMessageElement.classList.add('system-message', 'processing-indicator-text');
            processingMessageElement.textContent = "GAIA Prime is processing your command...";
            
            if(aiLoadingIndicator && aiLoadingIndicator.parentNode === storyOutput) {
                 storyOutput.insertBefore(processingMessageElement, aiLoadingIndicator);
            } else if (aiLoadingIndicator) {
                storyOutput.appendChild(processingMessageElement);
            } else {
                storyOutput.appendChild(processingMessageElement);
            }
        }
        processingMessageElement.style.display = 'block';
        if(staticIndicatorText) staticIndicatorText.style.display = 'block';
        if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'flex';
        storyOutput.scrollTop = storyOutput.scrollHeight;
    } else {
        if (processingMessageElement) {
            processingMessageElement.style.display = 'none';
        }
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
        gameTheme: "The game explores AI ethics and environmental sustainability in a sci-fi setting. The player is a Warden interacting with GAIA Prime, the planetary AI. Focus on descriptive text, player agency, and thematic challenges related to ecological balance or AI decisions."
    };

    let headers = { 'Content-Type': 'application/json' };
    if (supabase && gameState.currentUser && gameState.currentUser.token) {
        headers['Authorization'] = `Bearer ${gameState.currentUser.token}`;
    }

    try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(promptPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "AI engine request failed with status: " + response.status, details: `Status: ${response.status}` }));
            throw { message: errorData.error || `HTTP error ${response.status}`, details: errorData.details || `Response not OK from AI Engine.`};
        }

        const aiResponse = await response.json();

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
                    if (Object.prototype.hasOwnProperty.call(gameState, update.statusName)) {
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
    if (!playerInput || !storyOutput) return;
    const originalCommandText = playerInput.value.trim();
    if (!originalCommandText || gameState.isAwaitingAI) {
        if(playerInput) playerInput.focus();
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
        const expandedCommand = commandAliases[processedCommand];
        await typeText(`> ${escapeHtml(originalCommandText)} (${escapeHtml(expandedCommand)})`, true);
        processedCommand = expandedCommand;
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
     if (processedCommand === "quit") {
        if (gameState.currentUser === null) {
            await typeText("Exiting guest session. Your progress is not saved.", false, 'system-message');
            if(storyOutput) storyOutput.innerHTML += '<p class="system-message">Return to the main screen to log in or start a new guest session.</p>';
            if(playerInput) playerInput.disabled = true;
            if(submitCommandButton) submitCommandButton.disabled = true;
            if (logoutButton) logoutButton.textContent = "Back to Menu";
        } else { 
            await typeText("To leave the game, please use the 'Logout' button.", false, 'system-message');
        }
        playerInput.focus();
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
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    registerMessage.textContent = 'Registering...';
    registerMessage.className = 'auth-message';

    sessionStorage.setItem('isRegistering', 'true');

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: email.substring(0, email.indexOf('@')) || 'Warden',
            }
        }
    });

    if (signUpError) {
        sessionStorage.removeItem('isRegistering');
        registerMessage.textContent = `Registration failed: ${signUpError.message}`;
        registerMessage.classList.add('error');
        return;
    }

    if (signUpData.user) {
        registerMessage.textContent = 'Registration successful! Sending verification email...';
        registerMessage.className = 'auth-message success';

        try {
            const { error: verificationError } = await supabase.functions.invoke('initiate-email-verification', {
                body: { userId: signUpData.user.id, email: signUpData.user.email }
            });

            if (verificationError) {
                console.error("Error calling initiate-email-verification:", verificationError);
                registerMessage.textContent = `Registration complete, but could not send verification email: ${verificationError.message}. Please try to login or contact support.`;
                registerMessage.classList.remove('success');
                registerMessage.classList.add('error');
            } else {
                registerMessage.textContent = 'Registration successful! Please check your email to verify your account before logging in.';
                registerMessage.classList.add('success');
            }
        } catch (invokeError) {
            console.error("Critical error invoking initiate-email-verification:", invokeError);
            registerMessage.textContent = `Registration complete, but a critical error occurred while sending the verification email. Please contact support. (Code: INV_FAIL)`;
            registerMessage.classList.remove('success');
            registerMessage.classList.add('error');
        }
        toggleAuthForms(true);
    } else {
        sessionStorage.removeItem('isRegistering');
        registerMessage.textContent = 'Registration process did not complete as expected. Please try again.';
        registerMessage.classList.add('error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    if (!supabase || !loginForm || !loginMessage) return;
    const emailInput = loginForm.querySelector('#login-email');
    const passwordInput = loginForm.querySelector('#login-password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    loginMessage.textContent = 'Logging in...';
    loginMessage.className = 'auth-message';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        loginMessage.textContent = `Login failed: ${error.message}`;
        loginMessage.classList.add('error');
    } else if (data.user && data.session) {
        // onAuthStateChange will handle successful login
    } else {
        loginMessage.textContent = 'Login failed. Please check your credentials.';
        loginMessage.classList.add('error');
    }
}

async function handleLogout() {
    if (!supabase) {
        console.error('Supabase client not available for logout.');
        return;
    }
    
    if(playerInput) playerInput.disabled = true;
    if(submitCommandButton) submitCommandButton.disabled = true;
    
    const { error } = await supabase.auth.signOut();
    
    if(playerInput) playerInput.disabled = false; 
    if(submitCommandButton) submitCommandButton.disabled = false;

    if (error) {
        console.error('Error logging out:', error);
        if (userStatusArea && userEmailDisplay) {
            userEmailDisplay.textContent += ` (Logout failed: ${error.message})`;
        }
    }
    gameState.currentUser = null;
    resetGameState(); 
    showAuthUI();
    if (logoutButton) logoutButton.textContent = "Logout";
}

function playAsGuest() {
    gameState.currentUser = null; 
    resetGameState(); 
    updateTopUserStatus();
    showGameUI();
    startGameLogic(); 
}

async function setupUserSession(user, session) {
    console.warn('Setting up user session for:', user.email); // Kept as warn for visibility

    const { data: verifiedRecords, error: fetchStatusError } = await supabase
        .from('email_verifications')
        .select('id, user_id, email, is_verified, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('is_verified', true);

    if (fetchStatusError) {
        console.error('Error fetching custom email verification status from email_verifications:', fetchStatusError);
        if (loginMessage) {
            loginMessage.textContent = 'Could not check email verification status. Please try again.';
            loginMessage.className = 'auth-message error';
            loginMessage.dataset.preserveOnShowAuth = "true";
        }
        await supabase.auth.signOut();
        return;
    }

    if (!verifiedRecords || verifiedRecords.length === 0) {
        console.warn(`User ${user.email} logged in, BUT custom email verification is NOT complete. Signing out.`);
        if (loginMessage) {
            loginMessage.textContent = 'Your email address is not verified. Please check your inbox for the verification link, then log in again.';
            loginMessage.className = 'auth-message error';
            loginMessage.dataset.preserveOnShowAuth = "true";
        } else {
            alert('Your email address is not verified. Please check your inbox for the verification link, then try logging in again.');
        }
        await supabase.auth.signOut();
        return;
    }

    console.warn(`User ${user.email} custom email is verified. Proceeding to game.`); // Kept as warn
    gameState.currentUser = { ...user, token: session.access_token };
    
    resetGameState();
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

    if (loginMessage && loginMessage.dataset.preserveOnShowAuth === "true") {
        delete loginMessage.dataset.preserveOnShowAuth;
    } else if (loginMessage) {
        loginMessage.textContent = '';
    }

    if (registerMessage) registerMessage.textContent = '';
    toggleAuthForms(true);
}

function showGameUI() {
    if (authUiContainer) authUiContainer.style.display = 'none';
    if (gameUiContainer) gameUiContainer.style.display = 'flex';
    updateTopUserStatus();
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
    } else { 
        userEmailDisplay.textContent = "Guest";
        logoutButton.textContent = "Exit Guest Session";
        userStatusArea.style.display = 'flex';
    }
}

function resetGameState() {
    gameState.inventory = [];
    gameState.sectorStability = 100;
    gameState.aiSync = 100;
    gameState.currentLocationDescription = "at the GAIA Prime main console.";
    gameState.turnHistory = [];
    gameState.isAwaitingAI = false; 
    
    gameState.playerName = gameState.currentUser ? (gameState.currentUser.email.split('@')[0] || "Warden") : "Warden (Guest)";
    
    if(storyOutput) storyOutput.innerHTML = '';
    if(aiChoicesPanel) aiChoicesPanel.innerHTML = '';
    if(playerInput) {
        playerInput.value = '';
        playerInput.disabled = false;
    }
    if(submitCommandButton) submitCommandButton.disabled = false;
    showProcessingMessage(false);
    updateStatusDisplay();
}

async function startGameLogic() {
    if (!storyOutput || !playerInput) {
        console.error("Cannot start game logic, essential UI elements missing.");
        if (storyOutput) await typeText("Error: Game interface not loaded correctly. Please refresh.", false, 'error-message');
        return;
    }
    playerInput.disabled = false;
    if(submitCommandButton) submitCommandButton.disabled = false;

    updateStatusDisplay(); 

    await typeText("Initializing GAIA Prime interface...", false, 'system-message');
    await callAIEngine("##START_GAME##");

    if(playerInput) playerInput.focus();
}

// --- Email Verification Handling ---
async function handleEmailVerificationOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const verificationToken = urlParams.get('token');
    const type = urlParams.get('type');

    if (type === 'email_verification' && verificationToken) {
        if (authUiContainer) authUiContainer.style.display = 'flex';
        if (gameUiContainer) gameUiContainer.style.display = 'none';
        if (userStatusArea) userStatusArea.style.display = 'none';
        if (gameState.currentUser) {
             await supabase.auth.signOut();
        } else {
            resetGameState();
            showAuthUI();    
        }
        
        const messageDisplay = document.getElementById('login-message');

        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (playGuestButton && playGuestButton.parentElement) playGuestButton.parentElement.style.display = 'none';
        document.querySelectorAll('.auth-toggle').forEach(el => el.style.display = 'none');

        if (messageDisplay) {
            messageDisplay.textContent = 'Verifying your email, please wait...';
            messageDisplay.className = 'auth-message info';
        }

        try {
            const { data, error: invokeFnError } = await supabase.functions.invoke('complete-email-verification', {
                body: { token: verificationToken }
            });

            if (invokeFnError) {
                throw new Error(invokeFnError.message || 'Could not reach verification service.');
            } else if (data && data.error) {
                throw new Error(data.error);
            } else if (data && data.success) {
                if (messageDisplay) {
                    messageDisplay.textContent = 'Email successfully verified! You can now log in.';
                    messageDisplay.className = 'auth-message success';
                }
            } else {
                throw new Error('Verification process encountered an unexpected issue. Please try again.');
            }
        } catch (e) {
            console.error("Error during client-side email verification handling:", e);
            if (messageDisplay) {
                messageDisplay.textContent = `Verification failed: ${e.message}`;
                messageDisplay.className = 'auth-message error';
            }
        } finally {
            if (loginForm) loginForm.style.display = 'block';
            if (showLoginLink?.parentElement && showRegisterLink?.parentElement) {
                 showRegisterLink.parentElement.style.display = 'block';
                 showLoginLink.parentElement.style.display = 'none';   
            }
            if (playGuestButton && playGuestButton.parentElement) playGuestButton.parentElement.style.display = 'block';

            if (window.history.replaceState) {
                const cleanURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: cleanURL }, '', cleanURL);
            }
        }
    }
}

// --- App Initialization ---
async function initializeApp() {
    if (!supabase) {
        console.error("Supabase client not initialized. App cannot start.");
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<p style="color: white; text-align: center; padding: 50px; font-size: 1.2em;">Critical Error: Application services could not start. Please refresh or contact support if the issue persists.</p>';
        }
        return; 
    }

    const addListenerOnce = (element, eventType, handler) => {
        if (element && !element.dataset.listenerAttached) {
            element.addEventListener(eventType, handler);
            element.dataset.listenerAttached = "true";
        }
    };

    addListenerOnce(loginForm, 'submit', handleLogin); 
    addListenerOnce(registerForm, 'submit', handleRegistration);
    addListenerOnce(playGuestButton, 'click', playAsGuest);
    addListenerOnce(logoutButton, 'click', handleLogout);
    addListenerOnce(showRegisterLink, 'click', (e) => { e.preventDefault(); toggleAuthForms(false); });
    addListenerOnce(showLoginLink, 'click', (e) => { e.preventDefault(); toggleAuthForms(true); });
    addListenerOnce(closeHelpButton, 'click', closeHelpModalFunc);
    
    if (helpModal && !helpModal.dataset.listenerAttached) {
        helpModal.addEventListener('click', (event) => { if (event.target === helpModal) closeHelpModalFunc(); });
        helpModal.dataset.listenerAttached = "true";
    }
    
    addListenerOnce(submitCommandButton, 'click', handlePlayerCommand);
    
    if (playerInput && !playerInput.dataset.listenerAttached) {
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
                     playerInput.value = commandHistory[historyIndex];
                     playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                }
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    playerInput.value = commandHistory[historyIndex];
                    playerInput.setSelectionRange(playerInput.value.length, playerInput.value.length);
                } else if (historyIndex >= commandHistory.length -1 && commandHistory.length > 0) {
                     historyIndex = commandHistory.length; 
                     playerInput.value = ""; 
                }
            }
        });
        playerInput.dataset.listenerAttached = "true";
    }

    const setupPasswordToggle = (inputField, toggleIcon) => {
        if (inputField && toggleIcon) {
            if (!toggleIcon.dataset.passwordToggleListenerAttached) {
                toggleIcon.addEventListener('click', () => {
                    const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
                    inputField.setAttribute('type', type);
                    toggleIcon.textContent = type === 'password' ? 'visibility_off' : 'visibility';
                });
                toggleIcon.dataset.passwordToggleListenerAttached = "true";
            }
        }
    };

    setupPasswordToggle(loginPasswordInput, toggleLoginPasswordIcon);
    setupPasswordToggle(registerPasswordInput, toggleRegisterPasswordIcon);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("Error getting initial session:", sessionError);
        showAuthUI();
    } else if (session && session.user) {
        await setupUserSession(session.user, session);
    } else {
        showAuthUI();
    }

    await handleEmailVerificationOnLoad();

    supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUserId = gameState.currentUser ? gameState.currentUser.id : null;
        const newUserId = session && session.user ? session.user.id : null;
    
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            sessionStorage.removeItem('isRegistering');
            gameState.currentUser = null;
            if (gameUiContainer && gameUiContainer.style.display !== 'none') {
                if (storyOutput) storyOutput.innerHTML = '<p class="system-message">You have been logged out or your session has ended. Come back soon!</p>';
                if (playerInput) playerInput.disabled = true;
                if (submitCommandButton) submitCommandButton.disabled = true;
            }
            resetGameState();
            showAuthUI();
        } else if (event === 'SIGNED_IN') {
            const isRegistering = sessionStorage.getItem('isRegistering') === 'true';
    
            if (isRegistering) {
                sessionStorage.removeItem('isRegistering');
                console.warn('Auth: SIGNED_IN event after registration. Suppressing auto-login. User needs to verify email.'); // Kept as warn
                
                if (authUiContainer.style.display === 'none') {
                    showAuthUI();
                }
                toggleAuthForms(true);
    
                if (loginMessage && (!registerMessage.textContent.includes("Please check your email") && !loginMessage.textContent.includes("Please check your email"))) {
                     loginMessage.textContent = 'Registration complete. Please check your email to verify your account, then log in.';
                     loginMessage.className = 'auth-message info';
                }
    
            } else if (session && session.user) {
                if (currentUserId !== newUserId || !gameState.currentUser) {
                    await setupUserSession(session.user, session);
                } else {
                    gameState.currentUser = { ...session.user, token: session.access_token };
                    updateTopUserStatus();
                }
            }
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            sessionStorage.removeItem('isRegistering');
            if (session && session.user) {
                gameState.currentUser = { ...session.user, token: session.access_token };
                updateTopUserStatus();
                if (gameUiContainer && gameUiContainer.style.display === 'none' && authUiContainer && authUiContainer.style.display !== 'none' && gameState.currentUser.email_confirmed_at) {
                    showGameUI();
                    if (!gameState.isAwaitingAI && gameState.turnHistory.length === 0) {
                        await startGameLogic();
                    }
                }
            } else if (!session && currentUserId) {
                console.warn("Session became null after token refresh/update, treating as sign out."); // Kept as warn
                gameState.currentUser = null;
                resetGameState();
                showAuthUI();
            }
        }
    });
    
    const initialLoadFadeElements = document.querySelectorAll('.initial-load-fade');
    if (initialLoadFadeElements) {
        initialLoadFadeElements.forEach(el => el.classList.remove('initial-load-fade'));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
