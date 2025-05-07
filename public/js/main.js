import { trackEvent } from './tracker.js';

(() => {
  // ———————— DOM ELEMENTS ————————
  const header         = document.querySelector('header');
  const menuToggle     = document.querySelector('.menu-toggle');
  const navLinks       = document.querySelector('.nav-links');
  const themeToggle    = document.querySelector('.theme-toggle'); // placeholder if you add theme logic
  const sections       = document.querySelectorAll('section');
  const navSections    = document.querySelectorAll('section[id]');
  const contactForm    = document.getElementById('contactForm');
  const contactSection = document.getElementById('contact');

  // ———————— reCAPTCHA ON-DEMAND ————————
  let recaptchaLoaded = false;
  if (contactSection) {
    const recaptchaObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !recaptchaLoaded) {
          recaptchaLoaded = true;
          const script = document.createElement('script');
          script.src   = 'https://www.google.com/recaptcha/api.js?render=6LcHbh4rAAAAABRo54A4WU8pdJyO2E-5GBBBGE3v';
          script.defer = true;
          document.head.appendChild(script);
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px', threshold: 0.2 });
    recaptchaObserver.observe(contactSection);
  }

  // ———————— UTM PARAMS PARSER ————————
  const getUtmParams = () => {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source:  p.get('utm_source'),
      utm_medium:  p.get('utm_medium'),
      utm_campaign:p.get('utm_campaign'),
      utm_term:    p.get('utm_term'),
      utm_content: p.get('utm_content'),
    };
  };

  // ———————— SCROLL EFFECTS ————————
  const highlightActiveSection = () => {
    const offset = window.scrollY + 100;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const bottom = top + sec.offsetHeight;
      if (offset >= top && offset < bottom) {
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        const link = document.querySelector(`.nav-links a[href="#${sec.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  };

  const animateOnScroll = () => {
    document.querySelectorAll('.project-card, .timeline-item, .skill-category')
      .forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
          el.classList.add('fadeIn');
        }
      });
  };

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
    highlightActiveSection();
    animateOnScroll();
  });

  // ———————— MOBILE MENU TOGGLE ————————
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    document.querySelectorAll('.bar').forEach((bar, i) => {
      bar.classList.toggle('active');
      if (navLinks.classList.contains('active')) {
        if (i === 0) bar.style.transform = 'rotate(-45deg) translate(-5px,6px)';
        if (i === 1) bar.style.opacity   = '0';
        if (i === 2) bar.style.transform = 'rotate(45deg) translate(-5px,-6px)';
      } else {
        bar.style.transform = '';
        bar.style.opacity   = '';
      }
    });
  });

  navLinks.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('active');
      document.querySelectorAll('.bar').forEach(bar => {
        bar.style.transform = '';
        bar.style.opacity   = '';
      });
    }
  });

  // ———————— INITIAL LOAD ANIMATIONS ————————
  window.addEventListener('DOMContentLoaded', () => {
    animateOnScroll();
    document.querySelectorAll('.hero h1, .hero h2, .hero-description, .cta-container')
      .forEach((el, i) => el.classList.add('fadeIn', `delay-${i+1}`));
  });

  // ———————— CONTACT FORM + reCAPTCHA V3 ————————
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm));
      if (!data.name || !data.email || !data.message) {
        return showFormMessage('Please fill in all fields.', 'error');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return showFormMessage('Please enter a valid email address.', 'error');
      }
      if (typeof grecaptcha === 'undefined' || !grecaptcha.ready) {
        return showFormMessage('reCAPTCHA not yet loaded. Try again shortly.', 'error');
      }
      try {
        const token = await new Promise(res =>
          grecaptcha.ready(() =>
            grecaptcha.execute('6LcHbh4rAAAAABRo54A4WU8pdJyO2E-5GBBBGE3v', { action: 'contact' }).then(res)
          )
        );
        const formData = new FormData(contactForm);
        formData.append('g-recaptcha-response', token);

        const resp = await fetch('https://formspree.io/f/xblgnwdw', {
          method:  'POST',
          headers: { 'Accept': 'application/json' },
          body:    formData
        });
        const json = await resp.json();
        if (json.ok) {
          showFormMessage('Message sent! I’ll get back to you soon.', 'success');
          contactForm.reset();
        } else {
          const msg = json.errors?.map(e => e.message).join(', ') || 'Something went wrong.';
          showFormMessage(msg, 'error');
        }
      } catch (err) {
        console.error(err);
        showFormMessage('Network error. Please try later.', 'error');
      }
    });
  }

  function showFormMessage(msg, type) {
    document.querySelector('.form-message')?.remove();
    const div = document.createElement('div');
    div.className = `form-message ${type === 'error' ? 'form-error' : 'form-success'}`;
    div.textContent = msg;
    contactForm.parentNode.appendChild(div);
    setTimeout(() => {
      div.classList.add('fade-out');
      setTimeout(() => div.remove(), 300);
    }, 5000);
  }

  // ———————— LEAF-TRAIL MOUSE EFFECT ————————
  const createLeafTrail = () => {
    const colors = ['#4CAF50','#388E3C','#81C784','#C8E6C9'];
    document.addEventListener('mousemove', e => {
      const leaf = document.createElement('div');
      leaf.className = 'leaf-trail';
      Object.assign(leaf.style, {
        left:  `${e.pageX}px`,
        top:   `${e.pageY}px`,
        width: `${Math.random()*10+5}px`,
        height:`${Math.random()*10+5}px`,
        opacity:`${Math.random()*0.3+0.1}`,
        backgroundColor: colors[Math.floor(Math.random()*colors.length)],
        transform: `rotate(${Math.random()*360}deg)`,
      });
      document.body.appendChild(leaf);
      setTimeout(() => {
        leaf.style.opacity = '0';
        leaf.style.transform = `translate(${Math.random()*20-10}px, ${Math.random()*20+10}px)`;
        setTimeout(() => leaf.remove(), 500);
      }, 100);
    });
  };
  createLeafTrail();

  // ———————— LEAF-TRAIL & LOADER CSS ————————
  const style = document.createElement('style');
  style.innerHTML = `
    .leaf-trail {
      position: absolute; border-radius: 2px;
      pointer-events: none; z-index: 9999;
      transition: opacity 0.5s, transform 0.5s;
    }
    .form-message {
      padding:10px; margin-top:15px;
      border-radius:4px; transition:opacity 0.3s;
    }
    .form-success {
      background:rgba(76,175,80,0.1);
      border:1px solid var(--color-primary);
      color:var(--color-primary-light);
    }
    .form-error {
      background:rgba(244,67,54,0.1);
      border:1px solid #f44336; color:#e57373;
    }
    .fade-out { opacity:0; }
  `;
  document.head.appendChild(style);

  // ———————— SUSTAINABLE LOADER ————————
  const createSustainableLoader = () => {
    const loader = document.createElement('div');
    loader.className = 'sustainable-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-leaf"><span class="material-icons">eco</span></div>
        <div class="loader-text">Loading<span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span></div>
        <div class="loader-message">This site is optimized for minimal energy consumption</div>
      </div>`;
    document.body.appendChild(loader);

    const ls = document.createElement('style');
    ls.innerHTML = `
      .sustainable-loader {
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:var(--color-bg);display:flex;
        justify-content:center;align-items:center;
        z-index:9999;transition:opacity 0.5s;
      }
      .loader-content { text-align:center; }
      .loader-leaf { font-size:3rem;animation:pulse 1.5s infinite; }
      .loader-text { margin-top:1rem;font-weight:500; }
      .loader-message { margin-top:1rem;font-size:0.875rem;max-width:250px; }
      @keyframes pulse {0%{transform:scale(1)}50%{transform:scale(1.1);opacity:0.7}100%{transform:scale(1)}}
      .dot-1,.dot-2,.dot-3{animation:dots 1.5s infinite;opacity:0;}
      .dot-2{animation-delay:0.5s}.dot-3{animation-delay:1s}
      @keyframes dots{0%,100%{opacity:0}50%{opacity:1}}
    `;
    document.head.appendChild(ls);

    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 1500);
    });
  };
  createSustainableLoader();

  // ———————— COOKIEYES & CUSTOM ANALYTICS ————————
  let analyticsInited = false;

  function initAnalytics() {
    if (analyticsInited) return;
    console.debug('Analytics: initializing');

    // 1) Page view
    window.addEventListener('load', () =>
      trackEvent('page_view', {
        ...getUtmParams(),
        url: location.href,
        title: document.title,
        timestamp: Date.now()
      }), { once: true }
    );

    // 2) Section views
    new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          trackEvent('section_view', { section: en.target.id, timestamp: Date.now() });
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 }).observe(document.body);

    // 3) Clicks
    document.addEventListener('click', e => {
      const el = e.target.closest('a,button');
      if (!el) return;
      trackEvent('click', {
        tag: el.tagName, text: el.textContent.trim().slice(0,50),
        href: el.href, timestamp: Date.now()
      });
    });

    analyticsInited = true;
  }

  function checkConsent() {
    if (window.CookieYes?.getConsent) {
      const consent = window.CookieYes.getConsent();
      if (consent.statistics) initAnalytics();
      else console.debug('Analytics consent denied');
    } else {
      console.debug('CookieYes API not ready');
    }
  }

  window.addEventListener('DOMContentLoaded', checkConsent);
  window.addEventListener('cookieyes_consent_update', checkConsent);

})();
