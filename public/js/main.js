import { trackEvent } from './tracker.js';

// DOM Elements
const header = document.querySelector('header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const themeToggle = document.querySelector('.theme-toggle');
const sections = document.querySelectorAll('section');
const navSections  = document.querySelectorAll('section[id]');
const contactForm = document.getElementById('contactForm');
const contactSection = document.getElementById('contact');

// --- Flags ---
let customAnalyticsInitialized = false;
let recaptchaLoaded = false;
let sectionObserver = null;

/**
 * Dynamically loads the reCAPTCHA script when the contact section is visible.
 * This is for security and considered "Necessary".
 */
const loadRecaptchaScript = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !recaptchaLoaded) {
            console.log("DEBUG: Contact section visible, loading reCAPTCHA...");
            recaptchaLoaded = true;
            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js?render=6LcHbh4rAAAAABRo54A4WU8pdJyO2E-5GBBBGE3v';
            script.defer = true;
            document.head.appendChild(script);
            if (observer && contactSection) {
                observer.unobserve(contactSection);
            }
        }
    });
};

// Setup IntersectionObserver for reCAPTCHA loading
if (contactSection) {
    const recaptchaObserverOptions = { rootMargin: '0px', threshold: 0.1 };
    const recaptchaObs = new IntersectionObserver(loadRecaptchaScript, recaptchaObserverOptions);
    recaptchaObs.observe(contactSection);
}

// --- Analytics Initialization & Teardown ---

/**
 * Initializes all custom analytics tracking functionality.
 */
function initializeAnalytics() {
    if (customAnalyticsInitialized) {
        console.log('DEBUG: Custom analytics already initialized.');
        return;
    }
    console.log('DEBUG: Analytics consent granted. Initializing custom trackers...');

    // Helper function to parse UTM parameters
    function getUtmParams() {
        const params = new URLSearchParams(location.search);
        return {
            utm_source: params.get('utm_source'),
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            utm_term: params.get('utm_term'),
            utm_content: params.get('utm_content'),
        };
    }

    // 1) Page view on load
    const pageViewHandler = () => {
        const utmData = getUtmParams();
        const pageViewData = {
            url: location.href,
            title: document.title,
            timestamp: Date.now(),
            referrer: document.referrer || null,
            screen_width: screen.width,
            screen_height: screen.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            browser_language: navigator.language,
            browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            pathname: location.pathname,
            utm_source: utmData.utm_source,
            utm_medium: utmData.utm_medium,
            utm_campaign: utmData.utm_campaign,
            utm_term: utmData.utm_term,
            utm_content: utmData.utm_content,
        };
        console.log("DEBUG: Tracking page_view with data:", pageViewData);
        trackEvent('page_view', pageViewData);
    };

    if (document.readyState === 'complete') {
        pageViewHandler();
    } else {
        window.addEventListener('load', pageViewHandler, { once: true });
    }

    // 2) Track section impressions via IntersectionObserver
    if (navSections.length > 0 && !sectionObserver) {
        console.log("DEBUG: Initializing IntersectionObserver for section views.");
        sectionObserver = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && customAnalyticsInitialized) {
                    console.log("DEBUG: Tracking section_view:", entry.target.id);
                    trackEvent('section_view', {
                        section: entry.target.id,
                        timestamp: Date.now(),
                    });
                    observerInstance.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        navSections.forEach(sec => sectionObserver.observe(sec));
    } else if (navSections.length > 0 && sectionObserver) {
        console.log("DEBUG: Re-observing sections with existing IntersectionObserver.");
        navSections.forEach(sec => sectionObserver.observe(sec));
    }

    // 3) Track clicks on all links & buttons
    // Ensure this listener is only added once by initializeAnalytics
    // If initializeAnalytics is guarded by customAnalyticsInitialized, this is fine.
    document.addEventListener('click', (e) => {
        if (!customAnalyticsInitialized) return; // Extra guard if needed
        const el = e.target.closest('a, button');
        if (!el) return;
        const clickData = {
            tag: el.tagName.toLowerCase(),
            text: el.innerText ? el.innerText.trim().slice(0, 50) : '',
            href: el.href || null,
            timestamp: Date.now(),
        };
        console.log("DEBUG: Tracking click:", clickData);
        trackEvent('click', clickData);
    });

    // 4) Track hovers on any element with data-track-hover attribute
    document.querySelectorAll('[data-track-hover]').forEach(el => {
        // Ensure this listener is only added once
        // A simple way is to add a marker attribute to the element after adding the listener,
        // or ensure initializeAnalytics is only called once.
        if (!el.dataset.hoverListenerAdded) { // Example marker
            el.addEventListener('mouseenter', () => {
                if (!customAnalyticsInitialized) return; // Extra guard
                const hoverData = {
                    element: el.dataset.trackHover,
                    timestamp: Date.now(),
                };
                console.log("DEBUG: Tracking hover:", hoverData);
                trackEvent('hover', hoverData);
            });
            el.dataset.hoverListenerAdded = 'true';
        }
    });

    customAnalyticsInitialized = true;
    console.log('DEBUG: Custom analytics services are now active.');
}

/**
 * Disables analytics tracking and cleans up.
 */
function disableAnalytics() {
    if (!customAnalyticsInitialized && !sectionObserver) {
        console.log('DEBUG: Analytics not initialized or already disabled.');
        return;
    }
    console.log('DEBUG: Analytics consent revoked/missing. Disabling analytics...');
    // For this project, the main impact is stopping new data collection.
    // If you had complex listeners added to document/window that need specific removal,
    // you'd do that here. For instance, the click listener:
    // document.removeEventListener('click', yourStoredClickHandler);
    // However, since the listeners check 'customAnalyticsInitialized', they will mostly self-disable.
    // The hover listeners are on specific elements and would need more complex removal if required.
    // For simplicity, we'll rely on customAnalyticsInitialized flag to gate execution.

    if (sectionObserver) {
        console.log("DEBUG: Disconnecting IntersectionObserver for section views.");
        sectionObserver.disconnect();
        // sectionObserver = null; // Set to null so it can be re-created if consent is re-granted
    }

    customAnalyticsInitialized = false; // This is the primary gate
    console.log('DEBUG: Custom analytics services are now inactive.');
}

// --- CookieYes Integration Logic  ---

/**
 * Handles consent based on CookieYes data object.
 * @param {object} consentDetail - Object from event.detail or getCkyConsent().
 */
function handleCookieYesConsent(consentDetail) {
    let analyticsConsentGiven = false;

    if (consentDetail && consentDetail.categories && typeof consentDetail.categories.analytics === 'boolean') {
        // From getCkyConsent() or cookieyes_banner_load
        analyticsConsentGiven = consentDetail.categories.analytics;
        console.log('DEBUG: Consent status from categories.analytics:', analyticsConsentGiven);
    } else if (consentDetail && consentDetail.accepted && Array.isArray(consentDetail.accepted)) {
        // From cookieyes_consent_update
        analyticsConsentGiven = consentDetail.accepted.includes('analytics');
        console.log('DEBUG: Consent status from accepted.includes("analytics"):', analyticsConsentGiven);
    } else {
        console.warn('DEBUG: Could not determine analytics consent from CookieYes data:', consentDetail);
    }

    if (analyticsConsentGiven) {
        initializeAnalytics();
    } else {
        disableAnalytics();
    }
}

// 1. Listen for CookieYes banner load (initial consent state)
// This event fires when the banner is ready and initial consent is known.
document.addEventListener('cookieyes_banner_load', function(event) {
    console.log('DEBUG: CookieYes banner_load event. Detail:', event.detail);
    if (event.detail) {
        handleCookieYesConsent(event.detail);
    }
});

// 2. Listen for consent updates
// This event fires when the user changes their consent settings.
// !!! IMPORTANT: Verify the exact event name from CookieYes documentation.
// 'cookieyes_consent_update' is common.
document.addEventListener('cookieyes_consent_update', function(event) {
    console.log('DEBUG: CookieYes consent_update event. Detail:', event.detail);
    if (event.detail) {
        handleCookieYesConsent(event.detail);
    }
});

// 3. Fallback/Initial check using getCkyConsent() after DOM is ready
// This is a safety net in case the events are missed or if we need to check before they fire.
window.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: DOMContentLoaded. Initializing non-analytics UI elements.");

    animateOnScroll();
    const heroElements = document.querySelectorAll('.hero h1, .hero h2, .hero-description, .cta-container');
    heroElements.forEach((el, index) => {
        el.classList.add('fadeIn');
        el.classList.add(`delay-${index + 1}`);
    });

    setTimeout(() => {
        if (typeof window.getCkyConsent === 'function') {
            console.log('DEBUG: DOMContentLoaded - Fallback: Checking consent via getCkyConsent().');
            const consentData = window.getCkyConsent();
            if (consentData) {
                // Check if analytics is already initialized by an event
                if (!customAnalyticsInitialized) {
                    handleCookieYesConsent(consentData);
                } else {
                    console.log('DEBUG: Fallback - Analytics already initialized by event, no action needed from getCkyConsent.');
                }
            } else {
                console.log('DEBUG: DOMContentLoaded - Fallback: getCkyConsent() returned no data.');
                if (!customAnalyticsInitialized) disableAnalytics(); // Ensure disabled if no data
            }
        } else {
            console.log('DEBUG: DOMContentLoaded - Fallback: window.getCkyConsent not available yet.');
            if (!customAnalyticsInitialized) disableAnalytics(); // Ensure disabled if API not ready
        }
    }, 500);
});

// --- START: Plexus Lightbulb Animation for About Section ---
// This entire block should be placed inside your public/js/main.js file,
// replacing the previous startSustainabilityAnimation function.

let sustainabilityAnimationStarted = false;

function startSustainabilityAnimation() {
    if (sustainabilityAnimationStarted) return;
    sustainabilityAnimationStarted = true;
    console.log("DEBUG: About section visible, starting EPIC GENERATIVE sustainability animation...");

    const canvas = document.getElementById('sustainabilityAnimationCanvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error("Sustainability animation canvas not found.");
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context.");
        return;
    }

    let currentWidth = 300;
    let currentHeight = 390; // Default 1:1.3 aspect ratio

    function resizeCanvas() {
        const parent = canvas.parentElement;
        if (parent) {
            let containerWidth = parent.clientWidth;
            if (containerWidth <= 0) containerWidth = 280;

            let targetWidth = containerWidth;
            let targetHeight = targetWidth * 1.3;
            const maxVisualHeight = Math.min(window.innerHeight * 0.55, 320);

            if (targetHeight > maxVisualHeight) {
                targetHeight = maxVisualHeight;
                targetWidth = targetHeight / 1.3;
            }
            targetWidth = Math.max(200, targetWidth);
            targetHeight = targetWidth * 1.3;

            currentWidth = Math.floor(targetWidth);
            currentHeight = Math.floor(targetHeight);

            const dpr = window.devicePixelRatio || 1;
            canvas.width = currentWidth * dpr;
            canvas.height = currentHeight * dpr;
            canvas.style.width = `${currentWidth}px`;
            canvas.style.height = `${currentHeight}px`;
            ctx.scale(dpr, dpr);
            console.log(`DEBUG: Canvas resized to ${currentWidth}x${currentHeight}`);
        } else {
            const dpr = window.devicePixelRatio || 1;
            currentWidth = canvas.width / dpr;
            currentHeight = canvas.height / dpr;
        }
    }
    resizeCanvas();
    // Add a debounced resize listener for better responsiveness
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    });

    // --- Animation Theme & Parameters ---
    const bulbColor = '#3F51B5';        // Main structure
    const bulbAccentColor = 'rgba(120, 140, 230, 0.9)'; // Brighter points
    const plexusLineColor = 'rgba(63, 81, 181, 0.2)';  // Fainter connections
    const recycleSymbolColor = '#4CAF50'; // Green
    const recycleAccentColor = 'rgba(129, 199, 132, 0.9)'; // Lighter green points
    const recyclePlexusLineColor = 'rgba(76, 175, 80, 0.25)';
    const particleColor = '#81C784';
    const energyColor = 'rgba(173, 216, 230, 0.7)'; // Light blue for energy
    const backgroundColor = '#111111';

    const growthSpeed = 0.003; // Slower growth for more phases to be visible
    let globalTime = 0;
    let mainFormationProgress = 0; // Overall progress (0 to 1)

    // --- Structure Definitions ---
    const bulbOuterWidth = () => currentWidth * 0.65; // Slightly smaller bulb for effect
    const bulbOuterHeight = () => currentHeight * 0.75;
    const bulbBodyRatio = 0.60;
    const bulbNeckRatio = 0.18;
    const centerX = () => currentWidth / 2;
    const bulbTopY = () => currentHeight * 0.12;

    // JSDoc for type hinting (optional, but good for clarity)
    /** @typedef {{x: number, y: number, id: number, phase: number, appeared: boolean, alpha: number, radius: number, flare: number}} Point */
    /** @typedef {{p1: Point, p2: Point, id: number, phase: number, progress: number, alpha: number, energy: number}} Line */
    /** @typedef {{x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, color: string, type: 'trace' | 'ambient' | 'burst', targetLineId?: number, lineProgress?: number}} Particle */

    let allPoints = [];
    let allLines = [];
    const particles = [];
    let pointIdCounter = 0;
    let lineIdCounter = 0;

    // Easing function for smoother animations
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function createPointsForShape(shapeFunc, phase) {
        return shapeFunc().map((p, index, arr) => ({
            ...p,
            id: pointIdCounter++,
            phase,
            appeared: false,
            alpha: 0,
            radius: p.radius || (phase === 1 ? 1.7 : 1.4) * (currentWidth / 300), // Base radius
            flare: 0 // For spawn animation
        }));
    }

    function createLinesForPoints(points, phase, maxDistFactor, connectionProbability = 0.6, isStructural = false) {
        const lines = [];
        const maxDist = currentWidth * maxDistFactor;
        const relevantPoints = points.filter(p => p.phase <= phase); // Only connect points that should exist by this phase

        for (let i = 0; i < relevantPoints.length; i++) {
            for (let j = i + 1; j < relevantPoints.length; j++) {
                const p1 = relevantPoints[i];
                const p2 = relevantPoints[j];
                // Don't connect points from different primary shapes unless intended
                if (!isStructural && p1.shapeId !== p2.shapeId) continue;

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist && dist > 1 && Math.random() < connectionProbability) {
                    lines.push({ p1, p2, id: lineIdCounter++, phase, progress: 0, alpha: 0, energy: 0 });
                }
            }
        }
        return lines;
    }

    function getBulbShapePoints() {
        const points = [];
        const bodyH = bulbOuterHeight() * bulbBodyRatio;
        const bodyCY = bulbTopY() + bodyH / 2;
        const numEllipsePoints = 30;
        // Phase 1: Base and Neck points
        const neckTY = bulbTopY() + bodyH;
        const neckH = bulbOuterHeight() * bulbNeckRatio;
        const neckBY = neckTY + neckH;
        const neckWS = bulbOuterWidth() * 0.35; const neckWE = bulbOuterWidth() * 0.3;
        const baseTY = neckBY;
        const baseH = bulbOuterHeight() * (1 - bulbBodyRatio - bulbNeckRatio);
        const baseBY = baseTY + baseH;
        const baseW = bulbOuterWidth() * 0.35;

        // Base points (appear first)
        for(let i=0; i<=2; i++) {
            const t = i/2;
            points.push({ x: centerX() - baseW/2, y: baseBY - baseH * t, shapeId: 'bulb_base' });
            points.push({ x: centerX() + baseW/2, y: baseBY - baseH * t, shapeId: 'bulb_base' });
        }
        points.push({x: centerX(), y: baseBY, shapeId: 'bulb_base'}); // Center base

        // Neck points
        for(let i=0; i<=3; i++) {
            const t = i/3;
            points.push({ x: centerX() - (neckWE/2 + (neckWS-neckWE)/2 * (1-t)), y: neckBY - neckH * t, shapeId: 'bulb_neck'});
            points.push({ x: centerX() + (neckWE/2 + (neckWS-neckWE)/2 * (1-t)), y: neckBY - neckH * t, shapeId: 'bulb_neck'});
        }

        // Phase 2: Bulbous part points
        for (let i = 0; i < numEllipsePoints; i++) {
            const angle = (i / numEllipsePoints) * Math.PI * 2;
            const rX = (bulbOuterWidth() / 2) * (0.95 + Math.sin(angle * 5 + globalTime * 0.01) * 0.05); // Subtle breathing
            const rY = (bodyH / 2) * (0.95 + Math.cos(angle * 3 + globalTime * 0.01) * 0.05);
            points.push({
                x: centerX() + rX * Math.cos(angle),
                y: bodyCY + rY * Math.sin(angle),
                shapeId: 'bulb_body'
            });
        }
        return points;
    }

    function getRecycleSymbolPoints() {
        const points = [];
        const symbolSize = bulbOuterWidth() * 0.28; // Slightly smaller symbol
        const symbolCenterY = bulbTopY() + (bulbOuterHeight() * bulbBodyRatio) / 2.1; // Position
        const armRadius = symbolSize * 0.45;
        const arrowHeadSize = symbolSize * 0.2;
        const arrowBodyWidth = symbolSize * 0.1;

        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.PI / 1.5; // Initial rotation for arrows

            // Tip
            const tipX = centerX() + Math.cos(angle) * armRadius;
            const tipY = symbolCenterY + Math.sin(angle) * armRadius;
            points.push({ x: tipX, y: tipY, shapeId: `arrow${i}` });

            // Head base points
            points.push({ x: tipX - Math.cos(angle + Math.PI / 3.5) * arrowHeadSize, y: tipY - Math.sin(angle + Math.PI / 3.5) * arrowHeadSize, shapeId: `arrow${i}` });
            points.push({ x: tipX - Math.cos(angle - Math.PI / 3.5) * arrowHeadSize, y: tipY - Math.sin(angle - Math.PI / 3.5) * arrowHeadSize, shapeId: `arrow${i}` });

            // Inner curve control point (for a smoother arrow body)
            const controlAngle = angle + Math.PI / 3; // Towards the center of the bend
            points.push({
                x: centerX() + Math.cos(controlAngle) * armRadius * 0.7,
                y: symbolCenterY + Math.sin(controlAngle) * armRadius * 0.7,
                shapeId: `arrow${i}_curve`
            });

            // Tail point (connects to next arrow's inner part)
            const tailAngle = angle + (Math.PI * 2 / 3) * 0.65; // Angle for the tail end
            points.push({
                 x: centerX() + Math.cos(tailAngle) * armRadius * 0.5,
                 y: symbolCenterY + Math.sin(tailAngle) * armRadius * 0.5,
                 shapeId: `arrow${i}_tail`
            });
        }
        return points;
    }


    function initializeStructures() {
        pointIdCounter = 0; lineIdCounter = 0; particles.length = 0;
        const rawBulbPoints = getBulbShapePoints();
        const rawRecyclePoints = getRecycleSymbolPoints();

        // Assign phases based on order (example: base, then neck, then body, then symbol)
        allPoints = [
            ...rawBulbPoints.slice(0, 7).map(p => ({ ...p, id: pointIdCounter++, phase: 1, appeared: false, alpha: 0, radius: 1.8, flare: 0 })), // Base
            ...rawBulbPoints.slice(7, 15).map(p => ({ ...p, id: pointIdCounter++, phase: 2, appeared: false, alpha: 0, radius: 1.6, flare: 0 })), // Neck
            ...rawBulbPoints.slice(15).map(p => ({ ...p, id: pointIdCounter++, phase: 3, appeared: false, alpha: 0, radius: 1.5, flare: 0 })), // Body
            ...rawRecyclePoints.map(p => ({ ...p, id: pointIdCounter++, phase: 4, appeared: false, alpha: 0, radius: 1.3, flare: 0 })) // Symbol
        ];

        // Create lines based on phases
        allLines = [
            ...createLinesForPoints(allPoints.filter(p => p.phase <= 1), 1, 0.2, 0.9, true), // Bulb base structural
            ...createLinesForPoints(allPoints.filter(p => p.phase <= 2), 2, 0.25, 0.8, true), // Bulb neck structural
            ...createLinesForPoints(allPoints.filter(p => p.phase <= 3), 3, 0.2, 0.5), // Bulb body plexus
            ...createLinesForPoints(allPoints.filter(p => p.phase === 4), 4, 0.5, 0.9, true)  // Symbol structural lines (denser)
        ];
    }


    // --- Drawing Functions ---
    function draw() {
        ctx.clearRect(0, 0, currentWidth, currentHeight);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, currentWidth, currentHeight);

        const easedProgress = easeInOutCubic(mainFormationProgress);

        // Update and Draw Points
        allPoints.forEach(p => {
            const phaseStartTime = (p.phase - 1) * 0.20; // Stagger phase starts
            const phaseDuration = 0.3; // Duration for points in a phase to appear

            if (easedProgress >= phaseStartTime) {
                const pointLocalProgress = Math.min(1, (easedProgress - phaseStartTime) / phaseDuration);
                p.alpha += (pointLocalProgress - p.alpha) * 0.15; // Smoother fade in

                if (p.alpha > 0.01) {
                    p.appeared = true;
                    ctx.beginPath();
                    // Flare effect on spawn
                    if (pointLocalProgress < 0.5 && pointLocalProgress > 0) {
                        p.flare = Math.sin(pointLocalProgress * Math.PI) * p.radius * 1.5; // Flare grows then shrinks
                    } else {
                        p.flare *= 0.85; // Fade out flare
                    }
                    const currentRadius = p.radius * p.alpha * (1 + Math.sin(globalTime * 0.08 + p.id * 0.6) * 0.15); // Subtle pulse
                    ctx.arc(p.x, p.y, currentRadius + p.flare, 0, Math.PI * 2);
                    ctx.fillStyle = p.phase <= 3 ? bulbAccentColor : recycleAccentColor;
                    ctx.globalAlpha = p.alpha * (p.phase <=3 ? 0.7 : 0.9);
                    ctx.fill();
                }
            }
        });
        ctx.globalAlpha = 1;

        // Update and Draw Lines
        allLines.forEach(l => {
            if (l.p1.appeared && l.p2.appeared) {
                const phaseStartTime = (l.phase - 1) * 0.20 + 0.1; // Lines start after points in their phase
                const lineDuration = 0.4;
                 if (easedProgress >= phaseStartTime) {
                    const lineLocalProgress = Math.min(1, (easedProgress - phaseStartTime) / lineDuration);
                    l.progress += (lineLocalProgress - l.progress) * 0.1; // Smooth trace

                    if (l.progress > 0.01) {
                        ctx.beginPath();
                        const startX = l.p1.x;
                        const startY = l.p1.y;
                        const endX = l.p1.x + (l.p2.x - l.p1.x) * l.progress;
                        const endY = l.p1.y + (l.p2.y - l.p1.y) * l.progress;
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);

                        ctx.strokeStyle = l.phase <= 3 ? plexusLineColor : recyclePlexusLineColor;
                        ctx.lineWidth = (l.phase <= 3 ? 0.35 : 0.55) * (currentWidth / 300);
                        l.alpha += (l.progress - l.alpha) * 0.15;
                        ctx.globalAlpha = l.alpha * (l.phase <=3 ? 0.5 : 0.7) + Math.sin(globalTime * 0.1 + l.id * 0.4) * 0.05; // Shimmer
                        ctx.stroke();

                        // Line trace particle
                        if (l.progress > 0.05 && l.progress < 0.98 && mainFormationProgress < 0.95) {
                             ctx.beginPath();
                             ctx.arc(endX, endY, 1.2 * (currentWidth/300), 0, Math.PI*2);
                             ctx.fillStyle = l.phase <=3 ? bulbColor : recycleSymbolColor;
                             ctx.globalAlpha = 0.8;
                             ctx.fill();
                        }
                    }
                }
            }
        });
        ctx.globalAlpha = 1;

        // Manage and Draw Particles
        if (mainFormationProgress > 0.85 && particles.length < 70 && Math.random() < 0.25) { // More particles
            const point = allPoints[Math.floor(Math.random() * allPoints.length)];
            if (point && point.appeared && point.alpha > 0.5) {
                particles.push({
                    x: point.x, y: point.y,
                    vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, // More energetic
                    life: 1, maxLife: 50 + Math.random() * 50,
                    size: 0.6 + Math.random() * 0.7, color: particleColor,
                    type: 'ambient'
                });
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * particleSpeedFactor;
            p.y += p.vy * particleSpeedFactor;
            p.vx *= 0.98; // Dampening
            p.vy *= 0.98;
            p.life -= 1 / p.maxLife;

            if (p.life <= 0 || p.x < 0 || p.x > currentWidth || p.y < 0 || p.y > currentHeight) {
                particles.splice(i, 1); continue;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life * (currentWidth / 300), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life * 0.7;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    let animationFrameId;
    function renderLoop() {
        globalTime++;
        if (mainFormationProgress < 1) {
            mainFormationProgress += growthSpeed;
            mainFormationProgress = Math.min(1, mainFormationProgress);
        } else {
            // Once fully formed, could slow down particle spawning or change effects
        }
        draw();
        animationFrameId = requestAnimationFrame(renderLoop);
    }

    initializeStructures();
    renderLoop();

    return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
}
// --- END: Plexus Lightbulb Animation ---


// --- START: IntersectionObserver for About Section Animation ---
const aboutSectionForAnimation = document.getElementById('about'); // Target the #about section

if (aboutSectionForAnimation) {
    const animationObserverOptions = {
        rootMargin: '0px',
        threshold: 0.25 // Start when 25% of the section is visible
    };

    const animationObserverCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !sustainabilityAnimationStarted) {
                startSustainabilityAnimation();
                observer.unobserve(aboutSectionForAnimation); // Stop observing once started
            }
        });
    };

    const animationObserver = new IntersectionObserver(animationObserverCallback, animationObserverOptions);
    animationObserver.observe(aboutSectionForAnimation);
} else {
    console.warn("DEBUG: About section for animation trigger not found.");
}
// --- END: IntersectionObserver for About Section Animation ---

// Scroll handler for header effects
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    highlightActiveSection();
    animateOnScroll();
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => bar.classList.toggle('active')); 
    if (navLinks.classList.contains('active')) {
        bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
        bars[1].style.opacity = '0';
        bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
    } else {
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        bars[2].style.transform = 'none';
    }
});

// Close mobile menu when clicking a nav link
navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        navLinks.classList.remove('active');
        const bars = document.querySelectorAll('.bar');
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        bars[2].style.transform = 'none';
    }
});

// Function to highlight active section in navigation
function highlightActiveSection() {
    let scrollPosition = window.scrollY + 100;
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        if (
            scrollPosition >= sectionTop && 
            scrollPosition < sectionTop + sectionHeight
        ) {
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
            });
            const activeLink = document.querySelector(`.nav-links a[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    });
}

// Function to animate elements when they come into view
function animateOnScroll() {
    const animateElements = document.querySelectorAll('.project-card, .timeline-item, .skill-category');
    animateElements.forEach(el => {
        const elementPosition = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementPosition < windowHeight * 0.9) {
            el.classList.add('fadeIn');
        }
    });
}

// Contact Form Logic
if (contactForm) {
    contactForm.addEventListener('submit', e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(contactForm));
        if (!data.name || !data.email || !data.message) {
            showFormMessage('Please fill in all fields', 'error'); return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showFormMessage('Please enter a valid email address', 'error'); return;
        }
        if (typeof grecaptcha === 'undefined' || typeof grecaptcha.ready !== 'function') {
            showFormMessage('reCAPTCHA is not ready. Please wait or refresh.', 'error');
            console.error("reCAPTCHA object not ready for form submission."); return;
        }
        grecaptcha.ready(() => {
            grecaptcha.execute('6LcHbh4rAAAAABRo54A4WU8pdJyO2E-5GBBBGE3v', { action: 'contact' })
                .then(token => {
                    const formData = new FormData(contactForm);
                    formData.append('g-recaptcha-response', token);
                    fetch('https://formspree.io/f/xblgnwdw', {
                        method: 'POST',
                        headers: { 'Accept': 'application/json' },
                        body: formData
                    })
                    .then(res => res.json())
                    .then(json => {
                        if (json.ok) {
                            showFormMessage('Message sent! I’ll get back to you soon.', 'success');
                            contactForm.reset();
                        } else {
                            const msg = json.errors ? json.errors.map(e => e.message).join(', ') : 'Oops! Something went wrong.';
                            showFormMessage(msg, 'error');
                        }
                    })
                    .catch(() => showFormMessage('Network error. Please try again later.', 'error'));
                });
        });
    });
}

// Function to display form submission messages
function showFormMessage(message, type) {
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) existingMessage.remove();
    const messageElement = document.createElement('div');
    messageElement.className = `form-message ${type === 'error' ? 'form-error' : 'form-success'}`;
    messageElement.textContent = message;
    if (contactForm && contactForm.parentNode) {
        contactForm.parentNode.appendChild(messageElement);
    }
    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => messageElement.remove(), 300);
    }, 5000);
}

// Add a leaf cursor trail effect
function createLeafTrail() {
    const colors = ['#4CAF50', '#388E3C', '#81C784', '#C8E6C9'];
    document.addEventListener('mousemove', function(e) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf-trail';
        leaf.style.left = e.pageX + 'px';
        leaf.style.top = e.pageY + 'px';
        const size = Math.random() * 10 + 5;
        const opacity = Math.random() * 0.3 + 0.1;
        const rotationAngle = Math.random() * 360;
        const color = colors[Math.floor(Math.random() * colors.length)];
        leaf.style.width = size + 'px';
        leaf.style.height = size + 'px';
        leaf.style.opacity = opacity;
        leaf.style.backgroundColor = color;
        leaf.style.transform = `rotate(${rotationAngle}deg)`;
        document.body.appendChild(leaf);
        setTimeout(() => {
            leaf.style.opacity = '0';
            leaf.style.transform = `translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 + 10}px) rotate(${rotationAngle + 20}deg)`;
            setTimeout(() => {
                document.body.removeChild(leaf);
            }, 500);
        }, 100);
    });
}
if (typeof window !== 'undefined') { createLeafTrail(); }

// Add CSS for the leaf trail effect and form messages
const leafTrailStyle = document.createElement('style');
leafTrailStyle.innerHTML = `
    .leaf-trail {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 2px;
        background-color: var(--color-primary);
        pointer-events: none;
        z-index: 9999;
        opacity: 0.2;
        transition: opacity 0.5s, transform 0.5s;
    }
    
    .form-message {
        padding: 10px;
        margin-top: 15px;
        border-radius: 4px;
        opacity: 1;
        transition: opacity 0.3s;
    }
    
    .form-success {
        background-color: rgba(76, 175, 80, 0.1);
        border: 1px solid var(--color-primary);
        color: var(--color-primary-light);
    }
    
    .form-error {
        background-color: rgba(244, 67, 54, 0.1);
        border: 1px solid #f44336;
        color: #e57373;
    }
    
    .fade-out {
        opacity: 0;
    }
`;
if (typeof document !== 'undefined' && document.head) { document.head.appendChild(leafTrailStyle); }

// Create sustainable loading effect
function createSustainableLoader() {
    const loader = document.createElement('div');
    loader.className = 'sustainable-loader';
    const loaderContent = document.createElement('div');
    loaderContent.className = 'loader-content';
    const leafIcon = document.createElement('div');
    leafIcon.className = 'loader-leaf';
    leafIcon.innerHTML = '<span class="material-icons">eco</span>';
    const loadingText = document.createElement('div');
    loadingText.className = 'loader-text';
    loadingText.innerHTML = 'Loading<span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span>';
    const sustainabilityMessage = document.createElement('div');
    sustainabilityMessage.className = 'loader-message';
    sustainabilityMessage.textContent = 'This site is optimized for minimal energy consumption';   
    loaderContent.appendChild(leafIcon);
    loaderContent.appendChild(loadingText);
    loaderContent.appendChild(sustainabilityMessage);
    loader.appendChild(loaderContent);
    document.body.appendChild(loader);
    const loaderStyle = document.createElement('style');
    loaderStyle.innerHTML = `
        .sustainable-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--color-bg);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.5s, visibility 0.5s;
        }
        
        .loader-content {
            text-align: center;
        }
        
        .loader-leaf {
            font-size: 3rem;
            color: var(--color-primary);
            animation: pulse 1.5s infinite ease-in-out;
        }
        
        .loader-text {
            margin-top: 1rem;
            font-size: 1.2rem;
            font-weight: 500;
            color: var(--color-text);
        }
        
        .loader-message {
            margin-top: 1rem;
            font-size: 0.875rem;
            color: var(--color-text-muted);
            max-width: 250px;
        }
        
        @keyframes pulse {
            0% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.1);
                opacity: 0.7;
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        .dot-1, .dot-2, .dot-3 {
            animation: dots 1.5s infinite;
            opacity: 0;
        }
        
        .dot-2 {
            animation-delay: 0.5s;
        }
        
        .dot-3 {
            animation-delay: 1s;
        }
        
        @keyframes dots {
            0%, 100% {
                opacity: 0;
            }
            50% {
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(loaderStyle);

    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
            setTimeout(() => {
                document.body.removeChild(loader);
            }, 500);
        }, 1500);
    });
}
if (typeof window !== 'undefined') { createSustainableLoader(); }
