import { trackEvent } from './tracker.js';

// DOM Elements
const header = document.querySelector('header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const themeToggle = document.querySelector('.theme-toggle');
const sections = document.querySelectorAll('section');
const navSections  = document.querySelectorAll('section[id]');
const contactForm = document.getElementById('contactForm');

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

// 1) Page view on load
window.addEventListener('load', () => {
    trackEvent('page_view', {
        url: location.href,
        title: document.title,
        timestamp: Date.now(),
    });
});

// 2) Track section impressions via IntersectionObserver
const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            trackEvent('section_view', {
                section: entry.target.id,
                timestamp: Date.now(),
            });
            io.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

navSections.forEach(sec => io.observe(sec));

// 3) Track clicks on all links & buttons
document.addEventListener('click', e => {
    const el = e.target.closest('a, button');
    if (!el) return;
    trackEvent('click', {
        tag: el.tagName.toLowerCase(),
        text: el.innerText.trim().slice(0,50),
        href: el.href || null,
        timestamp: Date.now(),
    });
});

// 4) Track hovers on any element with data-track-hover attribute
document.querySelectorAll('[data-track-hover]').forEach(el => {
    el.addEventListener('mouseenter', () => {
        trackEvent('hover', {
            element: el.dataset.trackHover,
            timestamp: Date.now(),
        });
    });
});


// Initialize the sustainable loader
createSustainableLoader();
