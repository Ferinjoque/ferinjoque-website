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
let sustainabilityAnimationStarted = false; // Flag to ensure animation only starts once

function startSustainabilityAnimation() {
    if (sustainabilityAnimationStarted) return; // Don't start if already started
    sustainabilityAnimationStarted = true;
    console.log("DEBUG: About section visible, starting sustainability animation...");

    const canvas = document.getElementById('sustainabilityAnimationCanvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error("Sustainability animation canvas not found or is not a canvas element.");
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context for animation canvas.");
        return;
    }

    let currentWidth = 300; // Default
    let currentHeight = 390; // Default (300 * 1.3)

    function resizeCanvas() {
        const parent = canvas.parentElement;
        if (parent) {
            const newWidth = Math.min(parent.clientWidth, 450); // Max width
            currentWidth = newWidth > 0 ? newWidth : 300; // Ensure non-zero
            currentHeight = currentWidth * 1.3;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = currentWidth * dpr;
            canvas.height = currentHeight * dpr;
            canvas.style.width = `${currentWidth}px`;
            canvas.style.height = `${currentHeight}px`;
            ctx.scale(dpr, dpr);
        }
    }
    resizeCanvas(); // Initial resize to set dimensions even before animation starts
    // Optional: Consider adding a window resize listener if the parent's size can change
    // window.addEventListener('resize', resizeCanvas);


    // Animation variables (Plexus Lightbulb v2)
    const bulbColor = '#3F51B5';
    const recycleSymbolColor = '#4CAF50';
    const particleColor = '#81C784';
    const backgroundColor = '#111111';
    const plexusLineColor = 'rgba(63, 81, 181, 0.25)';
    const recyclePlexusLineColor = 'rgba(76, 175, 80, 0.25)';

    const growthSpeed = 0.007;
    const particleSpeedFactor = 0.5;
    let globalTime = 0;
    let formationProgress = 0;

    const bulbOuterWidth = () => currentWidth * 0.7;
    const bulbOuterHeight = () => currentHeight * 0.8;
    const bulbBodyRatio = 0.65;
    const bulbNeckRatio = 0.15;
    const centerX = () => currentWidth / 2;
    const bulbTopY = () => currentHeight * 0.1;

    let bulbPoints = [];
    let bulbLines = [];
    let recycleSymbolPoints = [];
    let recycleSymbolLines = [];
    const particles = [];
    let pointIdCounter = 0;

    // --- START: Shape Definition and Plexus Logic (from Plexus Lightbulb v2) ---
    function defineBulbPoints() {
        bulbPoints = [];
        pointIdCounter = 0;
        const bodyH = bulbOuterHeight() * bulbBodyRatio;
        const bodyCY = bulbTopY() + bodyH / 2;
        const numEllipsePoints = 20;
        for (let i = 0; i < numEllipsePoints; i++) {
            const angle = (i / numEllipsePoints) * Math.PI * 2;
            bulbPoints.push({
                id: pointIdCounter++,
                x: centerX() + (bulbOuterWidth() / 2) * Math.cos(angle),
                y: bodyCY + (bodyH / 2) * Math.sin(angle),
                spawnTime: Math.random() * 0.3,
            });
        }
        const neckTY = bulbTopY() + bodyH;
        const neckH = bulbOuterHeight() * bulbNeckRatio;
        const neckBY = neckTY + neckH;
        const neckWS = bulbOuterWidth() * 0.35;
        const neckWE = bulbOuterWidth() * 0.3;
        bulbPoints.push({ id: pointIdCounter++, x: centerX() - neckWS / 2, y: neckTY, spawnTime: 0.1 });
        bulbPoints.push({ id: pointIdCounter++, x: centerX() + neckWS / 2, y: neckTY, spawnTime: 0.1 });
        bulbPoints.push({ id: pointIdCounter++, x: centerX() + neckWE / 2, y: neckBY, spawnTime: 0.15 });
        bulbPoints.push({ id: pointIdCounter++, x: centerX() - neckWE / 2, y: neckBY, spawnTime: 0.15 });
        const baseTY = neckBY;
        const baseH = bulbOuterHeight() * (1 - bulbBodyRatio - bulbNeckRatio);
        const baseBY = baseTY + baseH;
        const baseW = bulbOuterWidth() * 0.35;
        bulbPoints.push({ id: pointIdCounter++, x: centerX() - baseW / 2, y: baseTY, spawnTime: 0.2 });
        bulbPoints.push({ id: pointIdCounter++, x: centerX() + baseW / 2, y: baseTY, spawnTime: 0.2 });
        bulbPoints.push({ id: pointIdCounter++, x: centerX() + baseW / 2, y: baseBY, spawnTime: 0.25 });
        bulbPoints.push({ id: pointIdCounter++, x: centerX() - baseW / 2, y: baseBY, spawnTime: 0.25 });
    }

    function defineRecycleSymbolPoints() {
        recycleSymbolPoints = [];
        recycleSymbolLines = [];
        const symbolSize = bulbOuterWidth() * 0.35;
        const symbolCenterY = bulbTopY() + (bulbOuterHeight() * bulbBodyRatio) / 2;
        const armLength = symbolSize / 2;
        const armThickness = symbolSize / 5;
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
            const x1 = centerX() + Math.cos(angle) * armLength;
            const y1 = symbolCenterY + Math.sin(angle) * armLength;
            const x2 = centerX() + Math.cos(angle) * (armLength - armThickness * 1.5);
            const y2 = symbolCenterY + Math.sin(angle) * (armLength - armThickness * 1.5);
            const x3 = centerX() + Math.cos(angle + Math.PI / 3) * (armLength - armThickness * 0.5);
            const y3 = symbolCenterY + Math.sin(angle + Math.PI / 3) * (armLength - armThickness * 0.5);
            const pTip = { id: pointIdCounter++, x: x1, y: y1, spawnTime: 0.3 + i * 0.05 };
            const pInner = { id: pointIdCounter++, x: x2, y: y2, spawnTime: 0.3 + i * 0.05 };
            const pBend = { id: pointIdCounter++, x: x3, y: y3, spawnTime: 0.35 + i * 0.05 };
            recycleSymbolPoints.push(pTip, pInner, pBend);

            const pNextInnerIndex = ((i + 1) % 3) * 3 + 1;
            // Ensure pNextInner exists, especially for the last iteration
            const pNextInner = recycleSymbolPoints[pNextInnerIndex] || pInner; // Fallback to pInner if index is out of bounds temporarily

            recycleSymbolLines.push({ p1: pTip, p2: pBend, spawnTime: 0.4 + i * 0.05 });
            recycleSymbolLines.push({ p1: pBend, p2: pNextInner, spawnTime: 0.45 + i * 0.05 });
            recycleSymbolLines.push({ p1: pInner, p2: pBend, spawnTime: 0.42 + i * 0.05 });
        }
    }

    function createPlexusLines(points, lines, maxDistFactor = 0.3) {
        lines.length = 0;
        const maxDist = currentWidth * maxDistFactor;
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const p1 = points[i]; const p2 = points[j];
                const dx = p1.x - p2.x; const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist && dist > 1) {
                    lines.push({ p1, p2, spawnTime: (p1.spawnTime + p2.spawnTime) / 2 + 0.1 });
                }
            }
        }
    }

    function drawStructure(points, lines, pointColor, lineColor, pointSize, lineWidth) {
        lines.forEach(line => {
            if (formationProgress >= line.spawnTime) {
                const lineProg = Math.min(1, (formationProgress - line.spawnTime) / 0.4);
                if (lineProg > 0) {
                    ctx.beginPath(); ctx.moveTo(line.p1.x, line.p1.y);
                    ctx.lineTo(line.p1.x + (line.p2.x - line.p1.x) * lineProg, line.p1.y + (line.p2.y - line.p1.y) * lineProg);
                    ctx.strokeStyle = lineColor; ctx.lineWidth = lineWidth * (currentWidth / 300);
                    ctx.globalAlpha = lineProg * 0.6 + Math.sin(globalTime * 0.001 + line.p1.id) * 0.1 + 0.1;
                    ctx.stroke();
                }
            }
        });
        ctx.globalAlpha = 1;
        points.forEach(point => {
            if (formationProgress >= point.spawnTime) {
                const pointProg = Math.min(1, (formationProgress - point.spawnTime) / 0.2);
                if (pointProg > 0) {
                    ctx.beginPath(); ctx.arc(point.x, point.y, pointSize * pointProg * (currentWidth / 300), 0, Math.PI * 2);
                    ctx.fillStyle = pointColor;
                    ctx.globalAlpha = pointProg * 0.8 + Math.sin(globalTime * 0.0015 + point.id) * 0.2;
                    ctx.fill();
                }
            }
        });
        ctx.globalAlpha = 1;
    }

    function manageParticles() {
        if (formationProgress > 0.9 && particles.length < 40 && Math.random() < 0.15) {
            const allLines = [...bulbLines, ...recycleSymbolLines].filter(l => formationProgress >= l.spawnTime + 0.3);
            if (allLines.length > 0) {
                const line = allLines[Math.floor(Math.random() * allLines.length)];
                const startAtP1 = Math.random() < 0.5;
                const p = startAtP1 ? line.p1 : line.p2;
                const target = startAtP1 ? line.p2 : line.p1;
                particles.push({
                    x: p.x, y: p.y, startX: p.x, startY: p.y,
                    targetX: target.x, targetY: target.y,
                    speed: (0.01 + Math.random() * 0.02) * particleSpeedFactor,
                    progress: 0, life: 1, maxLife: 60 + Math.random() * 60, color: particleColor,
                });
            }
        }
        ctx.fillStyle = particleColor;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed; p.x = p.startX + (p.targetX - p.startX) * p.progress;
            p.y = p.startY + (p.targetY - p.startY) * p.progress; p.life -= 1 / p.maxLife;
            if (p.life <= 0 || p.progress >= 1) { particles.splice(i, 1); continue; }
            ctx.beginPath(); ctx.arc(p.x, p.y, (0.8 + Math.random() * 0.4) * p.life * (currentWidth / 300), 0, Math.PI * 2);
            ctx.globalAlpha = p.life * 0.9; ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    // --- END: Shape Definition and Plexus Logic ---

    let animationFrameId;
    function render() {
        globalTime++;
        if (formationProgress < 1) {
            formationProgress += growthSpeed;
            formationProgress = Math.min(1, formationProgress);
        }
        ctx.clearRect(0, 0, currentWidth, currentHeight);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, currentWidth, currentHeight);
        drawStructure(bulbPoints, bulbLines, bulbColor, plexusLineColor, 1.8, 0.6);
        if (formationProgress > 0.2) {
            ctx.save();
            drawStructure(recycleSymbolPoints, recycleSymbolLines, recycleSymbolColor, recyclePlexusLineColor, 1.4, 0.7);
            ctx.restore();
        }
        manageParticles();
        animationFrameId = requestAnimationFrame(render);
    }

    // Initialize shapes
    defineBulbPoints();
    defineRecycleSymbolPoints();
    createPlexusLines(bulbPoints, bulbLines, 0.35);
    // recycleSymbolLines are defined in defineRecycleSymbolPoints

    render(); // Start the animation loop

    // Cleanup function (not strictly needed if observer unobserves, but good practice)
    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
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

// --- START: Contact Form Logic with Cooldown ---
let isFormSubmitting = false; // Flag for cooldown
const COOLDOWN_PERIOD_MS = 120000; // 2m cooldown
let cooldownTimerInterval = null; // Variable to hold the interval ID for the countdown

if (contactForm) {
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "Send Message";

    contactForm.addEventListener('submit', e => {
        e.preventDefault();

        if (isFormSubmitting) {
            showFormMessage('Please wait before submitting again.', 'error');
            return;
        }

        const data = Object.fromEntries(new FormData(contactForm));
        if (!data.name || !data.email || !data.message) {
            showFormMessage('Please fill in all fields', 'error');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showFormMessage('Please enter a valid email address', 'error');
            return;
        }

        if (typeof grecaptcha === 'undefined' || typeof grecaptcha.ready !== 'function') {
            showFormMessage('reCAPTCHA is not ready. Please wait or refresh.', 'error');
            console.error("reCAPTCHA object not ready for form submission.");
            return;
        }

        // Start submitting state
        isFormSubmitting = true;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
        }
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) existingMessage.remove();


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
                    .then(res => {
                        if (!res.ok) {
                           return res.json().then(errData => {
                                throw {jsonError: errData, status: res.status};
                           });
                        }
                        return res.json();
                    })
                    .then(json => {
                        if (json.ok) {
                            showFormMessage('Message sent! I’ll get back to you soon.', 'success');
                            contactForm.reset();
                        } else {
                            const msg = json.errors ? json.errors.map(err => err.message).join(', ') : 'Oops! Something went wrong.';
                            showFormMessage(msg, 'error');
                        }
                    })
                    .catch(error => {
                        console.error("Form submission error:", error);
                        if (error.jsonError && error.jsonError.errors) {
                             const msg = error.jsonError.errors.map(e => e.message).join(', ');
                             showFormMessage(msg, 'error');
                        } else {
                            showFormMessage('Network error or submission failed. Please try again later.', 'error');
                        }
                    })
                    .finally(() => {
                        // Start cooldown with countdown timer
                        if (submitButton) {
                            let secondsRemaining = COOLDOWN_PERIOD_MS / 1000;
                            submitButton.textContent = `Wait ${secondsRemaining}s`;
                            // Clear any existing interval before starting a new one
                            if (cooldownTimerInterval) {
                                clearInterval(cooldownTimerInterval);
                            }
                            cooldownTimerInterval = setInterval(() => {
                                secondsRemaining--;
                                if (secondsRemaining > 0) {
                                    submitButton.textContent = `Wait ${secondsRemaining}s`;
                                } else {
                                    clearInterval(cooldownTimerInterval);
                                    isFormSubmitting = false;
                                    submitButton.disabled = false;
                                    submitButton.textContent = originalButtonText;
                                }
                            }, 1000);
                        } else { // Fallback if button not found, just use timeout
                             setTimeout(() => {
                                isFormSubmitting = false;
                             }, COOLDOWN_PERIOD_MS);
                        }
                    });
                })
                .catch(recaptchaError => {
                    console.error("reCAPTCHA execution error:", recaptchaError);
                    showFormMessage('Failed to verify reCAPTCHA. Please try again.', 'error');
                    isFormSubmitting = false;
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                });
        });
    });
}
// --- END: Contact Form Logic with Cooldown ---

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
