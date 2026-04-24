/* ============================================================
   script.js
   All interactive JavaScript for the JNS portfolio.
   Vanilla ES6+ — no external libraries.
   ============================================================ */

(() => {
  'use strict';

  /* ---------- Shared helpers ---------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || !window.matchMedia('(hover: hover)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  ready(init);

  function init() {
    initYearStamp();
    initMobileNav();
    initSmoothScroll();
    initFadeInObserver();
    initScrollSpy();
    initScrollProgress();
    initCardSpotlight();
    initCounters();
    initEasterEgg();

    // Decorative effects — skipped under reduced-motion preference.
    if (!prefersReducedMotion) {
      initCustomCursor();
      initMagneticButtons();
      initTypewriter();
      initAboutTilt();
      initParallax();
    } else {
      // Just reveal the subtitle text as-is.
      const sub = document.querySelector('.hero-subtitle');
      if (sub) sub.textContent = sub.textContent.trim();
    }
  }

  /* =========================================================
     1. Year stamp
     ========================================================= */
  function initYearStamp() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* =========================================================
     2. Mobile nav toggle
     ========================================================= */
  function initMobileNav() {
    const btn = document.querySelector('.nav-toggle');
    const nav = document.querySelector('#nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });
  }

  /* =========================================================
     3. Smooth scroll for in-page anchors
     ========================================================= */
  function initSmoothScroll() {
    const nav = document.querySelector('#nav');
    const navBtn = document.querySelector('.nav-toggle');

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
        if (nav) nav.classList.remove('open');
        if (navBtn) navBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* =========================================================
     4. Fade-in observer with stagger
     ========================================================= */
  function initFadeInObserver() {
    const fades = document.querySelectorAll('.fade-in');
    if (!fades.length) return;

    const STAGGER_MS = 80;
    const childSelector = '.glass-card, .social-link, .project-row';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('visible');

          // Apply stagger delay to direct/nested children.
          const children = el.querySelectorAll(childSelector);
          children.forEach((child, i) => {
            child.style.transitionDelay = `${i * STAGGER_MS}ms`;
          });

          observer.unobserve(el);
        });
      },
      { threshold: 0.08 }
    );

    fades.forEach((el) => observer.observe(el));
  }

  /* =========================================================
     5. Scroll-spy nav (IntersectionObserver based)
     ========================================================= */
  function initScrollSpy() {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    // Track each section's intersection ratio so we can pick the most-visible one.
    const ratios = new Map();
    sections.forEach((s) => ratios.set(s.id, 0));

    const setActive = (id) => {
      navLinks.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', isActive);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.intersectionRatio);
        });
        // Pick section with highest ratio currently visible.
        let bestId = null;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        if (bestId) setActive(bestId);
      },
      {
        // Multiple thresholds for finer-grained ratio updates.
        threshold: [0, 0.15, 0.3, 0.5, 0.7, 1],
        rootMargin: '-80px 0px -40% 0px',
      }
    );

    sections.forEach((s) => observer.observe(s));
  }

  /* =========================================================
     6. Scroll progress bar
     ========================================================= */
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'scroll-progress__fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);

    let ticking = false;
    const update = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? clamp(window.scrollY / docHeight, 0, 1) : 0;
      fill.style.width = `${pct * 100}%`;
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* =========================================================
     7. Custom cursor (lerp ring + snap dot)
     ========================================================= */
  function initCustomCursor() {
    if (isTouchDevice) return;

    const ring = document.createElement('div');
    ring.className = 'cursor-ring is-hidden';
    const dot = document.createElement('div');
    dot.className = 'cursor-dot is-hidden';
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.documentElement.classList.add('has-custom-cursor');

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: target.x, y: target.y };
    let visible = false;

    document.addEventListener(
      'mousemove',
      (e) => {
        target.x = e.clientX;
        target.y = e.clientY;
        // Dot snaps directly.
        dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
        if (!visible) {
          visible = true;
          ring.classList.remove('is-hidden');
          dot.classList.remove('is-hidden');
        }
      },
      { passive: true }
    );

    document.addEventListener('mouseleave', () => {
      ring.classList.add('is-hidden');
      dot.classList.add('is-hidden');
      visible = false;
    });
    document.addEventListener('mouseenter', () => {
      ring.classList.remove('is-hidden');
      dot.classList.remove('is-hidden');
      visible = true;
    });

    // Hover-state for interactive elements.
    const hoverSelector = 'a, button, .glass-card';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(hoverSelector)) {
        ring.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(hoverSelector)) {
        ring.classList.remove('is-hover');
      }
    });

    // Lerp loop for the ring.
    const tick = () => {
      ringPos.x = lerp(ringPos.x, target.x, 0.18);
      ringPos.y = lerp(ringPos.y, target.y, 0.18);
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* =========================================================
     8. Mouse-tracking spotlight on .glass-card
     ========================================================= */
  function initCardSpotlight() {
    const cards = document.querySelectorAll('.glass-card');
    if (!cards.length) return;

    cards.forEach((card) => {
      let frame = 0;
      let pendingX = 0;
      let pendingY = 0;

      const apply = () => {
        card.style.setProperty('--mouse-x', `${pendingX}px`);
        card.style.setProperty('--mouse-y', `${pendingY}px`);
        frame = 0;
      };

      card.addEventListener(
        'mousemove',
        (e) => {
          const rect = card.getBoundingClientRect();
          pendingX = e.clientX - rect.left;
          pendingY = e.clientY - rect.top;
          if (!frame) frame = requestAnimationFrame(apply);
        },
        { passive: true }
      );

      card.addEventListener('mouseleave', () => {
        // Recenter the spotlight gracefully.
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
      });
    });
  }

  /* =========================================================
     9. Magnetic buttons
     ========================================================= */
  function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn');
    if (!buttons.length) return;

    const RANGE = 120;
    const MAX = 10;

    buttons.forEach((btn) => {
      let frame = 0;
      let tx = 0;
      let ty = 0;

      const onMove = (e) => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > RANGE) {
          tx = 0;
          ty = 0;
        } else {
          const strength = 1 - dist / RANGE;
          tx = (dx / RANGE) * MAX * (1 + strength);
          ty = (dy / RANGE) * MAX * (1 + strength);
          tx = clamp(tx, -MAX, MAX);
          ty = clamp(ty, -MAX, MAX);
        }
        if (!frame) {
          frame = requestAnimationFrame(() => {
            btn.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            frame = 0;
          });
        }
      };

      const reset = () => {
        tx = 0;
        ty = 0;
        btn.style.transition = 'transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        btn.style.transform = 'translate3d(0, 0, 0)';
        // Drop the transition after the ease-back so subsequent moves are instant.
        setTimeout(() => {
          btn.style.transition = '';
        }, 360);
      };

      window.addEventListener('mousemove', onMove, { passive: true });
      btn.addEventListener('mouseleave', reset);
    });
  }

  /* =========================================================
     10. Hero typewriter
     ========================================================= */
  function initTypewriter() {
    const sub = document.querySelector('.hero-subtitle');
    if (!sub) return;

    const fullText = sub.textContent.trim();
    if (!fullText) return;

    sub.textContent = '';
    const textNode = document.createTextNode('');
    const caret = document.createElement('span');
    caret.className = 'typewriter-caret';
    caret.setAttribute('aria-hidden', 'true');
    sub.appendChild(textNode);
    sub.appendChild(caret);

    let i = 0;
    const SPEED = 28; // ms per character
    const tick = () => {
      if (i <= fullText.length) {
        textNode.nodeValue = fullText.slice(0, i);
        i += 1;
        setTimeout(tick, SPEED);
      } else {
        // Let caret keep blinking — it's a nice touch.
        // Optional: fade caret out after a few seconds.
        setTimeout(() => {
          caret.style.transition = 'opacity 600ms ease';
          caret.style.opacity = '0';
        }, 4000);
      }
    };
    setTimeout(tick, 350);
  }

  /* =========================================================
     11. Animated number counters
     ========================================================= */
  function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    if (!counters.length) return;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const DURATION = 1500;

    const animate = (el) => {
      const target = parseFloat(el.getAttribute('data-count')) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const start = performance.now();

      const step = (now) => {
        const elapsed = now - start;
        const t = clamp(elapsed / DURATION, 0, 1);
        const value = target * easeOut(t);
        const formatted = Number.isInteger(target)
          ? Math.round(value).toLocaleString()
          : value.toFixed(1);
        el.textContent = formatted + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach((el) => {
      el.textContent = '0' + (el.getAttribute('data-suffix') || '');
      observer.observe(el);
    });
  }

  /* =========================================================
     12. About-photo 3D tilt
     ========================================================= */
  function initAboutTilt() {
    const photo = document.querySelector('.about-photo');
    if (!photo) return;

    const MAX_DEG = 8;
    let frame = 0;
    let rx = 0;
    let ry = 0;

    const onMove = (e) => {
      const rect = photo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      ry = clamp(dx * MAX_DEG, -MAX_DEG, MAX_DEG);
      rx = clamp(-dy * MAX_DEG, -MAX_DEG, MAX_DEG);
      if (!frame) {
        frame = requestAnimationFrame(() => {
          photo.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
          frame = 0;
        });
      }
    };

    photo.addEventListener('mousemove', onMove, { passive: true });
    photo.addEventListener('mouseleave', () => {
      photo.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    });
  }

  /* =========================================================
     13. Parallax on hero background blobs
     ========================================================= */
  function initParallax() {
    // Look for any of the common background-blob class names.
    const targets = document.querySelectorAll('.hero-bg, .hero-blob, .hero-mesh, .mesh-blob, .photo-glow');
    if (!targets.length) return;

    const SPEED = 0.3;
    let ticking = false;

    const update = () => {
      const y = window.scrollY * SPEED;
      targets.forEach((el) => {
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      });
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* =========================================================
     14. Easter egg — type "jns"
     ========================================================= */
  function initEasterEgg() {
    const SECRET = 'jns';
    let buffer = '';

    const overlay = document.createElement('div');
    overlay.className = 'easter-shimmer';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    const trigger = () => {
      overlay.classList.add('is-active');
      // eslint-disable-next-line no-console
      console.log(
        '%cHey there, curious dev. Thanks for poking around. — JNS',
        'color:#34d399; font-weight:600; font-size:13px;'
      );
      setTimeout(() => overlay.classList.remove('is-active'), 800);
    };

    document.addEventListener('keydown', (e) => {
      // Ignore typing inside form fields.
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }
      if (!/^[a-zA-Z]$/.test(e.key)) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) {
        trigger();
        buffer = '';
      }
    });
  }
})();
