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

  // Demo reservation list (replace with backend/API later)
// const guestReservations = [
//   { id: 1, name: "Mark Laude", seats: 2, status: "" },
//   { id: 2, name: "Alexia Cruz", seats: 3, status: "" },
//   { id: 3, name: "Juan Dela Cruz", seats: 1, status: "" }
// ];
const API_URL = "https://script.google.com/macros/s/AKfycbwIgOTzXCyT8lL4j2GRT0OOwaTPfdkSEgW7oKieyq4OzFCCIv9_YQc6Z-Ektn292gtV/exec";

const guestSearchInput = document.getElementById("guestSearchInput");
const rsvpCodeInput = document.getElementById("rsvpCodeInput");
const findGuestBtn = document.getElementById("findGuestBtn");
const lookupMsg = document.getElementById("lookupMsg");
const rsvpForm = document.getElementById("rsvpForm");
const guestName = document.getElementById("guestName");
const reservedSeats = document.getElementById("reservedSeats");
const seatListWrap = document.getElementById("seatListWrap");
const rsvpResult = document.getElementById("rsvpResult");

let currentGuest = null;
let currentCode = "";

// ---------- Helpers ----------
function buildApiUrl(action, params = {}) {
  const qp = new URLSearchParams({ action: String(action).toLowerCase(), ...params });
  return `${API_URL}?${qp.toString()}`;
}

// Robust JSONP for Apps Script redirects
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = `cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    let settled = false;

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[cb]; } catch (_) {}
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("JSONP timeout"));
    }, 15000);

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
      reject(new Error("JSONP script load failed"));
    };

    // IMPORTANT: callback must be in the original request URL
    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}callback=${encodeURIComponent(cb)}`;
    document.body.appendChild(script);
  });
}

function renderSeatRows(seatList = []) {
  seatListWrap.innerHTML = "";

  seatList.forEach((seat, idx) => {
    const row = document.createElement("div");
    row.className = "seat-row";
    row.innerHTML = `
      <label>Seat ${idx + 1} - ${seat.seat_name || `Guest ${idx + 1}`}</label>
      <select class="seat-status" required>
        <option value="">Select status</option>
        <option value="Attending" ${seat.status === "Attending" ? "selected" : ""}>Attending</option>
        <option value="Unable to Attend" ${seat.status === "Unable to Attend" ? "selected" : ""}>Unable to Attend</option>
      </select>
    `;
    seatListWrap.appendChild(row);
  });
}

// ---------- Find ----------
findGuestBtn?.addEventListener("click", async () => {
  const keyword = (guestSearchInput.value || "").trim();
  const code = (rsvpCodeInput.value || "").trim();

  if (!keyword) {
    lookupMsg.textContent = "Please enter your name first.";
    rsvpForm.style.display = "none";
    currentGuest = null;
    return;
  }
  if (!code) {
    lookupMsg.textContent = "Please enter your RSVP code.";
    rsvpForm.style.display = "none";
    currentGuest = null;
    return;
  }

  lookupMsg.textContent = "Searching...";
  rsvpResult.textContent = "";
  rsvpForm.style.display = "none";

  try {
    const url = buildApiUrl("find", { name: keyword, code: code });
    // debug
    console.log("FIND URL:", url);

    const data = await jsonp(url);
    console.log("FIND RESPONSE:", data);

    if (!data || !data.ok) {
      lookupMsg.textContent = (data && data.message) ? data.message : "No reservation found.";
      currentGuest = null;
      return;
    }

    currentGuest = data.guest;
    currentCode = code;

    guestName.value = currentGuest.name || "";
    reservedSeats.value = currentGuest.seats ?? "";
    renderSeatRows(currentGuest.seat_list || []);

    lookupMsg.textContent = "Reservation found.";
    rsvpForm.style.display = "grid";
  } catch (err) {
    console.error("FIND ERROR:", err);
    lookupMsg.textContent = "Unable to connect to RSVP backend. Please try again.";
    currentGuest = null;
  }
});

// ---------- Submit ----------
rsvpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentGuest) {
    rsvpResult.textContent = "Please search your reservation first.";
    return;
  }

  const selects = Array.from(document.querySelectorAll(".seat-status"));
  if (!selects.length) {
    rsvpResult.textContent = "No seat rows found.";
    return;
  }

  const statuses = selects.map(s => (s.value || "").trim());
  if (statuses.some(v => !v)) {
    rsvpResult.textContent = "Please select status for all attendees.";
    return;
  }

  rsvpResult.textContent = "Submitting...";

  try {
    const url = buildApiUrl("submitseats", {
      id: String(currentGuest.id),
      code: currentCode,
      seat_statuses: statuses.join(",")
    });
    // debug
    console.log("SUBMIT URL:", url);

    const data = await jsonp(url);
    console.log("SUBMIT RESPONSE:", data);

    if (data && data.ok) {
      const attending = data.totals?.attending ?? 0;
      const unable = data.totals?.unable ?? 0;
      rsvpResult.textContent =
        `Thank you, ${currentGuest.name}. Your RSVP has been recorded. Attending: ${attending}, Unable to Attend: ${unable}.`;
    } else {
      rsvpResult.textContent = (data && data.message) ? data.message : "Submission failed.";
    }
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    rsvpResult.textContent = "Submission failed. Please try again.";
  }
});

})();