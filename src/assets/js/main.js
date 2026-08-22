(() => {
  "use strict";

  // ==============================
  // Config
  // ==============================
  const WEDDING_DATE = "2026-11-28T14:00:00"; // local timezone
  const OPEN_ANIMATION_MS = 1300;
  const API_URL =
    "https://script.google.com/macros/s/AKfycbwIgOTzXCyT8lL4j2GRT0OOwaTPfdkSEgW7oKieyq4OzFCCIv9_YQc6Z-Ektn292gtV/exec";

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

  // RSVP refs (exist only on RSVP-related pages/sections)
  const guestSearchInput = document.getElementById("guestSearchInput");
  const rsvpCodeInput = document.getElementById("rsvpCodeInput");
  const findGuestBtn = document.getElementById("findGuestBtn");
  const lookupMsg = document.getElementById("lookupMsg");
  const rsvpForm = document.getElementById("rsvpForm");
  const guestName = document.getElementById("guestName");
  const reservedSeats = document.getElementById("reservedSeats");
  const seatListWrap = document.getElementById("seatListWrap");
  const rsvpResult = document.getElementById("rsvpResult");

  const targetDate = new Date(WEDDING_DATE);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentGuest = null;
  let currentCode = "";

  const hasRsvpLookup =
    !!guestSearchInput &&
    !!rsvpCodeInput &&
    !!findGuestBtn &&
    !!lookupMsg &&
    !!rsvpForm;

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

  function safeSetText(el, text) {
    if (el) el.textContent = text;
  }

  function buildApiUrl(action, params = {}) {
    const qp = new URLSearchParams({
      action: String(action || "").toLowerCase(),
      ...params,
    });
    return `${API_URL}?${qp.toString()}`;
  }

  // Robust JSONP for Apps Script
  function jsonp(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const cb = `cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const script = document.createElement("script");
      let settled = false;

      function cleanup() {
        if (script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[cb];
        } catch (_) {}
      }

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("JSONP timeout"));
      }, timeoutMs);

      window[cb] = (data) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error(`JSONP script load failed: ${script.src}`));
      };

      const sep = url.includes("?") ? "&" : "?";
      script.src = `${url}${sep}callback=${encodeURIComponent(cb)}`;
      script.async = true;
      document.body.appendChild(script);
    });
  }

  function renderSeatRows(seatList = []) {
    if (!seatListWrap) return;
    seatListWrap.innerHTML = "";

    seatList.forEach((seat, idx) => {
      const row = document.createElement("div");
      row.className = "seat-row";
      row.innerHTML = `
        <label for="seat-status-${idx}">Seat ${idx + 1} - ${seat.seat_name || `Guest ${idx + 1}`}</label>
        <select id="seat-status-${idx}" class="seat-status" required>
          <option value="" ${!seat.status ? "selected" : ""} disabled>Select status</option>
          <option value="Attending" ${seat.status === "Attending" ? "selected" : ""}>Attending</option>
          <option value="Unable to Attend" ${seat.status === "Unable to Attend" ? "selected" : ""}>Unable to Attend</option>
        </select>
      `;
      seatListWrap.appendChild(row);
    });
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
    const maxShift = 28;

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
  // RSVP logic
  // ==============================
  function initRsvp() {
    if (!hasRsvpLookup) return;

    findGuestBtn.addEventListener("click", async () => {
      const keyword = (guestSearchInput.value || "").trim();
      const code = (rsvpCodeInput.value || "").trim();

      if (!keyword) {
        safeSetText(lookupMsg, "Please enter your name first.");
        if (rsvpForm) rsvpForm.style.display = "none";
        currentGuest = null;
        return;
      }

      if (!code) {
        safeSetText(lookupMsg, "Please enter your RSVP code.");
        if (rsvpForm) rsvpForm.style.display = "none";
        currentGuest = null;
        return;
      }

      safeSetText(lookupMsg, "Searching...");
      safeSetText(rsvpResult, "");
      if (rsvpForm) rsvpForm.style.display = "none";

      try {
        const url = buildApiUrl("find", { name: keyword, code });
        const data = await jsonp(url);

        if (!data || !data.ok) {
          safeSetText(lookupMsg, data?.message || "No reservation found.");
          console.log("FIND RESPONSE:", data);
          currentGuest = null;
          return;
        }

        currentGuest = data.guest || null;
        currentCode = code;

        if (guestName) guestName.value = currentGuest?.name || "";
        if (reservedSeats) reservedSeats.value = currentGuest?.seats ?? "";
        renderSeatRows(currentGuest?.seat_list || []);

        safeSetText(lookupMsg, `Reservation found.`);
        if (rsvpForm) rsvpForm.style.display = "grid";
      } catch (err) {
        console.error("FIND ERROR:", err);
        safeSetText(lookupMsg, "Unable to connect to RSVP backend. Please try again.");
        currentGuest = null;
      }
    });

    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!currentGuest) {
        safeSetText(rsvpResult, "Please search your reservation first.");
        return;
      }

      const selects = Array.from(rsvpForm.querySelectorAll(".seat-status"));
      if (!selects.length) {
        safeSetText(rsvpResult, "No seat rows found.");
        return;
      }

      const statuses = selects.map((s) => (s.value || "").trim());
      if (statuses.some((v) => !v)) {
        safeSetText(rsvpResult, "Please select status for all attendees.");
        return;
      }

      safeSetText(rsvpResult, "Submitting...");

      try {
        const url = buildApiUrl("submitseats", {
          id: String(currentGuest.id),
          code: currentCode,
          seat_statuses: statuses.join(","),
        });

        const data = await jsonp(url);

        if (data && data.ok) {
          const attending = data.totals?.attending ?? 0;
          const unable = data.totals?.unable ?? 0;
          safeSetText(
            rsvpResult,
            `Thank you, ${currentGuest.name}. Your RSVP has been recorded. Attending: ${attending}, Unable to Attend: ${unable}.`
          );
        } else {
          safeSetText(rsvpResult, data?.message || "Submission failed.");
          console.log("SUBMIT RESPONSE:", data);
        }
      } catch (err) {
        console.error("SUBMIT ERROR:", err);
        safeSetText(rsvpResult, "Submission failed. Please try again.");
      }
    });
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
    initRsvp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();