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

let customAnalyticsInitialized = false;
let recaptchaLoaded = false;

const loadRecaptcha = (entries, observer) => {
    entries.forEach(entry => {
        // Check if the contact section is intersecting (visible) and script hasn't loaded
        if (entry.isIntersecting && !recaptchaLoaded) {
            console.log("DEBUG: Contact section visible, loading reCAPTCHA...");
            recaptchaLoaded = true; // Set flag

            // Create the script element
            const script = document.createElement('script');
            // IMPORTANT: Replace YOUR_SITE_KEY with your actual reCAPTCHA v3 Site Key
            script.src = 'https://www.google.com/recaptcha/api.js?render=6LcHbh4rAAAAABRo54A4WU8pdJyO2E-5GBBBGE3v';
            script.defer = true; // Use defer
            // script.async = true; // Alternatively use async

            // Append to head or body
            document.head.appendChild(script); // Appending to head is common

            // Stop observing once loaded
            observer.unobserve(contactSection);
        }
    });
};

// Only set up observer if contact section exists
if (contactSection) {
    const observerOptions = {
        rootMargin: '0px', // Trigger as soon as it enters viewport
        threshold: 0.1 // Trigger when 10% is visible
    };
    const observer = new IntersectionObserver(loadRecaptcha, observerOptions);
    observer.observe(contactSection);
}

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
    if (navSections.length > 0) {
        const sectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log("DEBUG: Tracking section_view:", entry.target.id);
                    trackEvent('section_view', {
                        section: entry.target.id,
                        timestamp: Date.now(),
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
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
    if (!customAnalyticsInitialized) {
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

    customAnalyticsInitialized = false; // This is the primary gate
    console.log('DEBUG: Custom analytics services are now inactive.');
}

// --- CookieYes Integration Logic (Based on Expert Review) ---

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

    // Non-analytics UI initializations that should always run
    animateOnScroll();
    const heroElements = document.querySelectorAll('.hero h1, .hero h2, .hero-description, .cta-container');
    heroElements.forEach((el, index) => {
        el.classList.add('fadeIn');
        el.classList.add(`delay-${index + 1}`);
    });

    // Attempt to get initial consent if CookieYes SDK is ready
    // Give CookieYes script a moment to ensure window.getCkyConsent is available
    setTimeout(() => {
        if (typeof window.getCkyConsent === 'function') {
            console.log('DEBUG: DOMContentLoaded - Fallback: Checking consent via getCkyConsent().');
            const consentData = window.getCkyConsent();
            if (consentData) {
                // Only initialize if not already done by banner_load event
                if (!customAnalyticsInitialized && (!consentData.categories || consentData.categories.analytics !== true)) {
                    // If consent is explicitly no or not yet given, ensure disableAnalytics is called
                    // in case a previous state was true.
                    disableAnalytics();
                } else if (!customAnalyticsInitialized && consentData.categories && consentData.categories.analytics === true) {
                     handleCookieYesConsent(consentData);
                }
            } else {
                console.log('DEBUG: DOMContentLoaded - Fallback: getCkyConsent() returned no data, relying on events.');
                disableAnalytics(); // Default to disabled if no data from API
            }
        } else {
            console.log('DEBUG: DOMContentLoaded - Fallback: window.getCkyConsent not available yet. Relying on events.');
            // If analytics might have been initialized from a previous consent cookie
            // before CookieYes fully loads and overrides, it's safer to ensure it's disabled here.
            if (!customAnalyticsInitialized) { // Only if not already initialized by an event
                 disableAnalytics();
            }
        }
    }, 500); // Adjust delay if needed, or use a more robust polling mechanism for getCkyConsent if required earlier
});

// Scroll handler for header effects
window.addEventListener('scroll', () => {
    // Add scrolled class to header when scrolled down
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // Highlight active section in navigation
    highlightActiveSection();
    
    // Animate elements when they come into view
    animateOnScroll();
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    
    // Animate hamburger icon
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
        
        // Reset hamburger icon
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
            // Remove active class from all links
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
            });
            
            // Add active class to current section link
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

if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    // collect & validate
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

    if (typeof grecaptcha === 'undefined' || !grecaptcha.ready) {
        showFormMessage('reCAPTCHA not loaded yet. Please wait a moment and try again.', 'error');
        console.error("reCAPTCHA object not ready.");
        return;
    }

    // run recaptcha v3
    grecaptcha.ready(() => {
      grecaptcha.execute('6LcHbh4rAAAAABRo54A4WU8pdJyO2E-5GBBBGE3v', { action: 'contact' })
        .then(token => {
          // append the recaptcha response
          const formData = new FormData(contactForm);
          formData.append('g-recaptcha-response', token);

          // post to Formspree
          fetch('https://formspree.io/f/xblgnwdw', {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
          })
          .then(res => res.json())
          .then(json => {
            if (json.ok) {
              showFormMessage(
                'Message sent! I’ll get back to you soon.',
                'success'
              );
              contactForm.reset();
            } else {
              // Formspree returns errors in json.errors
              const msg = json.errors
                ? json.errors.map(e => e.message).join(', ')
                : 'Oops! Something went wrong.';
              showFormMessage(msg, 'error');
            }
          })
          .catch(() => {
            showFormMessage(
              'Network error. Please try again later.',
              'error'
            );
          });
        });
    });
  });
}

// Function to display form submission messages
function showFormMessage(message, type) {
    // Remove any existing message
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.classList.add('form-message');
    messageElement.classList.add(type === 'error' ? 'form-error' : 'form-success');
    messageElement.textContent = message;
    
    // Add to the DOM after the form
    contactForm.parentNode.appendChild(messageElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }, 5000);
}

// Add a leaf cursor trail effect for sustainability theme
function createLeafTrail() {
    const colors = ['#4CAF50', '#388E3C', '#81C784', '#C8E6C9'];
    
    document.addEventListener('mousemove', function(e) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf-trail';
        leaf.style.left = e.pageX + 'px';
        leaf.style.top = e.pageY + 'px';
        
        // Randomize leaf properties for variety
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
        
        // Animate and remove the leaf
        setTimeout(() => {
            leaf.style.opacity = '0';
            leaf.style.transform = `translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 + 10}px) rotate(${rotationAngle + 20}deg)`;
            
            setTimeout(() => {
                document.body.removeChild(leaf);
            }, 500);
        }, 100);
    });
}

// Initialize the leaf trail effect
createLeafTrail();

// Add CSS for the leaf trail effect
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
document.head.appendChild(leafTrailStyle);

// Call initial animations on page load
window.addEventListener('DOMContentLoaded', () => {
    // Animate elements that are already visible
    animateOnScroll();
    
    // Add fadeIn animations to hero content
    const heroElements = document.querySelectorAll('.hero h1, .hero h2, .hero-description, .cta-container');
    heroElements.forEach((el, index) => {
        el.classList.add('fadeIn');
        el.classList.add(`delay-${index + 1}`);
    });
});

// Create sustainable loading effect
function createSustainableLoader() {
    const loader = document.createElement('div');
    loader.className = 'sustainable-loader';
    
    const loaderContent = document.createElement('div');
    loaderContent.className = 'loader-content';
    
    // Add leaf icon
    const leafIcon = document.createElement('div');
    leafIcon.className = 'loader-leaf';
    leafIcon.innerHTML = '<span class="material-icons">eco</span>';
    
    // Add loading text
    const loadingText = document.createElement('div');
    loadingText.className = 'loader-text';
    loadingText.innerHTML = 'Loading<span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span>';
    
    // Add sustainability message
    const sustainabilityMessage = document.createElement('div');
    sustainabilityMessage.className = 'loader-message';
    sustainabilityMessage.textContent = 'This site is optimized for minimal energy consumption';
    
    loaderContent.appendChild(leafIcon);
    loaderContent.appendChild(loadingText);
    loaderContent.appendChild(sustainabilityMessage);
    loader.appendChild(loaderContent);
    
    document.body.appendChild(loader);
    
    // Add loading animation styles
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
    
    // Hide loader after page is fully loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
            
            // Remove loader after transition
            setTimeout(() => {
                document.body.removeChild(loader);
            }, 500);
        }, 1500); // Show loader for at least 1.5 seconds for effect
    });
}

// Initialize the sustainable loader
createSustainableLoader();
