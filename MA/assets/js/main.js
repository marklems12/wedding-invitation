(() => {
  "use strict";

  // ==============================
  // Config
  // ==============================
  const WEDDING_DATE = "2026-11-28T14:00:00"; // local timezone
  const OPEN_ANIMATION_MS = 1300;

  // ==============================
  // DOM refs
  // ==============================
  const intro = document.getElementById("intro");
  const site = document.getElementById("site");
  const openBtn = document.getElementById("openInviteBtn");

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minsEl = document.getElementById("mins");
  const secsEl = document.getElementById("secs");

  const cards = Array.from(document.querySelectorAll(".sections .card"));
  const parallaxEls = Array.from(document.querySelectorAll(".parallax-layer"));

  const targetDate = new Date(WEDDING_DATE);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ==============================
  // Helpers
  // ==============================
  const pad2 = (n) => String(n).padStart(2, "0");

  function setCountdown(days = 0, hours = 0, mins = 0, secs = 0) {
    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;
    daysEl.textContent = String(days);
    hoursEl.textContent = pad2(hours);
    minsEl.textContent = pad2(mins);
    secsEl.textContent = pad2(secs);
  }

  // ==============================
  // Intro / Envelope
  // ==============================
  function showIntroEveryRefresh() {
    if (intro) intro.classList.remove("hide", "opening");
    if (site) site.classList.remove("show");
  }

  function bindOpenButton() {
    if (!openBtn) return;

    openBtn.addEventListener("click", () => {
      if (!intro || !site) return;

      intro.classList.add("opening");

      setTimeout(() => {
        intro.classList.add("hide");
        site.classList.add("show");
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }, reducedMotion ? 0 : OPEN_ANIMATION_MS);
    });
  }

  // ==============================
  // Countdown
  // ==============================
  function updateCountdown() {
    if (Number.isNaN(targetDate.getTime())) {
      setCountdown(0, 0, 0, 0);
      return;
    }

    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      setCountdown(0, 0, 0, 0);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    setCountdown(days, hours, mins, secs);
  }

  // ==============================
  // Reveal animation
  // ==============================
  function initReveal() {
    if (!cards.length) return;

    cards.forEach((card, index) => {
      card.classList.add("reveal-init");
      card.style.setProperty("--reveal-delay", `${index * 60}ms`);
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("reveal-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-in");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    cards.forEach((card) => io.observe(card));
  }

  // ==============================
  // Subtle parallax
  // ==============================
  function initParallax() {
    if (reducedMotion || !parallaxEls.length) return;

    let ticking = false;
    const maxShift = 28; // max translate in px for subtle effect

    function applyParallax() {
      const scrollY = window.scrollY || window.pageYOffset;

      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallaxSpeed || "0.08");
        const y = Math.max(-maxShift, Math.min(maxShift, scrollY * speed * 0.12));
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    applyParallax();
  }

  // ==============================
  // Init
  // ==============================
  function init() {
    showIntroEveryRefresh();
    bindOpenButton();

    updateCountdown();
    setInterval(updateCountdown, 1000);

    initReveal();
    initParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();