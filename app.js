"use strict";

// ---------- Shortcuts to elements on the page ----------
const $ = (id) => document.getElementById(id);
const pillDate = $("pillDate");
const pillTime = $("pillTime");
const display = $("display");
const sessionLabel = $("sessionLabel");
const controls = $("controls");
const btnSet = $("btnSet");
const btnChange = $("btnChange");
const btnClear = $("btnClear");
const btnStart = $("btnStart");
const infoTotal = $("infoTotal");
const infoEnd = $("infoEnd");
const infoDone = $("infoDone");

// ---------- Settings (a settings panel comes later) ----------
const settings = { hour12: true, twoMinWarning: true, keepAwakeInClock: true };

// ---------- Presets ----------
const presets = [
  { name: "Focus", seconds: 90 * 60, kind: "focus" },
  { name: "Short Break", seconds: 10 * 60, kind: "break" },
  { name: "Long Break", seconds: 20 * 60, kind: "break" },
];

// ---------- State ----------
let mode = "clock"; // "clock" | "timer" | "stopwatch"
document.body.dataset.mode = mode;

const timer = {
  preset: presets[0],
  totalMs: presets[0].seconds * 1000,
  remainingMs: presets[0].seconds * 1000,
  endAt: 0,          // the exact clock moment the timer will finish
  running: false,
  finished: false,
};
const sw = { running: false, startedAt: 0, elapsedMs: 0 };
const completed = { focus: 0, breaks: 0 };

// ---------- Helpers ----------
const pad = (n) => String(n).padStart(2, "0");

function formatHMS(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
}
function formatHMSFloor(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
}
function formatClockTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: settings.hour12,
  });
}

// ---------- Timer logic ----------
function loadPreset(p) {
  timer.preset = p;
  timer.totalMs = p.seconds * 1000;
  timer.remainingMs = timer.totalMs;
  timer.running = false;
  timer.finished = false;
}

function timerRemaining(nowMs) {
  return timer.running ? Math.max(0, timer.endAt - nowMs) : timer.remainingMs;
}

function timerStartPause() {
  const nowMs = Date.now();
  if (timer.running) {                       // pause
    timer.remainingMs = Math.max(0, timer.endAt - nowMs);
    timer.running = false;
  } else {                                   // start or resume
    if (timer.finished || timer.remainingMs <= 0) loadPreset(timer.preset);
    timer.endAt = nowMs + timer.remainingMs;
    timer.running = true;
  }
}

function timerClear() { loadPreset(timer.preset); }

function timerChange() {
  const i = presets.indexOf(timer.preset);
  loadPreset(presets[(i + 1) % presets.length]);
}

function finishTimer() {
  timer.running = false;
  timer.finished = true;
  timer.remainingMs = 0;
  playAlarm();
  recordSession(timer.preset.kind, timer.totalMs);
}

// Accepts "H:M:S" (like 1:30:00) or just minutes (like 25). Returns seconds or null.
function parseDuration(text) {
  const parts = text.trim().split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const n = parts.map(Number);
  let total;
  if (n.length === 1) {
    total = n[0] * 60;
  } else if (n.length === 3) {
    if (n[1] > 59 || n[2] > 59) return null;
    total = n[0] * 3600 + n[1] * 60 + n[2];
  } else {
    return null;
  }
  if (total <= 0 || total > 99 * 3600 + 59 * 60 + 59) return null;
  return total;
}

function timerSet() {
  const text = window.prompt(
    "Set countdown as HH:MM:SS (example 1:30:00)\nor just minutes (example 25):", "0:25:00"
  );
  if (text === null) return;                 // user pressed Cancel
  const seconds = parseDuration(text);
  if (seconds === null) {
    window.alert("That doesn't look right. Try 1:30:00 or 25. Minutes and seconds must be 0 to 59.");
    return;
  }
  let custom = presets.find((p) => p.name === "Custom");
  if (!custom) { custom = { name: "Custom", seconds, kind: "focus" }; presets.push(custom); }
  custom.seconds = seconds;
  loadPreset(custom);
}

// ---------- Stopwatch logic ----------
function swElapsed(nowMs) {
  return sw.running ? sw.elapsedMs + (nowMs - sw.startedAt) : sw.elapsedMs;
}
function swStartPause() {
  const nowMs = Date.now();
  if (sw.running) { sw.elapsedMs += nowMs - sw.startedAt; sw.running = false; }
  else { sw.startedAt = nowMs; sw.running = true; }
}
function swClear() { sw.running = false; sw.elapsedMs = 0; }

// ---------- Drawing the screen ----------
function updatePill(now) {
  pillDate.textContent = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: settings.hour12,
  }).formatToParts(now);
  pillTime.innerHTML = parts
    .map((p) => (p.type === "second" ? '<span class="sec">' + p.value + "</span>" : p.value))
    .join("");
}

function render(now) {
  const nowMs = now.getTime();
  display.classList.remove("warn", "done");
  sessionLabel.classList.remove("alert");
  controls.hidden = mode === "clock";

  if (mode === "clock") {
    let h = now.getHours();
    if (settings.hour12) h = h % 12 || 12;
    display.textContent = pad(h) + ":" + pad(now.getMinutes());
    sessionLabel.textContent = "DESK CLOCK";
    infoTotal.textContent = "--";
    infoEnd.textContent = "--";

  } else if (mode === "timer") {
    const remaining = timerRemaining(nowMs);
    display.textContent = formatHMS(remaining);
    if (timer.finished) {
      display.classList.add("done");
      sessionLabel.textContent = "TIME'S UP";
      sessionLabel.classList.add("alert");
    } else {
      sessionLabel.textContent = timer.preset.name.toUpperCase();
      if (settings.twoMinWarning && timer.running && remaining <= 120000) {
        display.classList.add("warn");
      }
    }
    infoTotal.textContent = formatHMS(timer.totalMs);
    infoEnd.textContent = timer.running ? formatClockTime(new Date(nowMs + remaining)) : "--";
    btnStart.textContent = timer.running ? "Pause"
      : (!timer.finished && timer.remainingMs < timer.totalMs) ? "Resume" : "Start";

  } else {
    display.textContent = formatHMSFloor(swElapsed(nowMs));
    sessionLabel.textContent = "STOPWATCH";
    infoTotal.textContent = "--";
    infoEnd.textContent = "--";
    btnStart.textContent = sw.running ? "Pause"
      : sw.elapsedMs > 0 ? "Resume" : "Start";
  }

  // Set and Change only make sense for the timer
  [btnSet, btnChange].forEach((b) => {
    b.disabled = mode !== "timer";
    b.style.opacity = mode === "timer" ? "1" : "0.3";
  });
  infoDone.textContent = todayStats().focus;
}

// ---------- Buttons ----------
document.querySelectorAll(".mode").forEach((b) =>
  b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.body.dataset.mode = mode;
    document.querySelectorAll(".mode").forEach((x) =>
      x.classList.toggle("active", x === b)
    );
    tick();
  })
);
btnStart.addEventListener("click", () => { (mode === "timer" ? timerStartPause : swStartPause)(); tick(); });
btnClear.addEventListener("click", () => { (mode === "timer" ? timerClear : swClear)(); tick(); });
btnChange.addEventListener("click", () => { timerChange(); tick(); });

// ---------- The heartbeat: runs 4 times per second ----------
function tick() {
  const now = new Date();
  if (timer.running && now.getTime() >= timer.endAt) finishTimer();
  updatePill(now);
  render(now);
  syncWakeLock();
}
tick();
setInterval(tick, 250);

// ---------- Set countdown panel (steppers) ----------
const setPanel = $("setPanel");
const setOk = $("setOk");
const setVals = { h: 0, m: 25, s: 0 };
const setLimits = { h: 23, m: 59, s: 59 };

function refreshSetPanel() {
  $("numH").textContent = pad(setVals.h);
  $("numM").textContent = pad(setVals.m);
  $("numS").textContent = pad(setVals.s);
  const valid = setVals.h + setVals.m + setVals.s > 0;
  setOk.disabled = !valid;
  setOk.style.opacity = valid ? "1" : "0.35";
}
function openSetPanel() {
  const total = Math.round(timer.totalMs / 1000);   // start from the current timer
  setVals.h = Math.min(23, Math.floor(total / 3600));
  setVals.m = Math.floor((total % 3600) / 60);
  setVals.s = total % 60;
  refreshSetPanel();
  setPanel.hidden = false;
}
function closeSetPanel() { setPanel.hidden = true; }

function step(unit, dir) {
  const size = setLimits[unit] + 1;
  setVals[unit] = (setVals[unit] + dir + size) % size;   // wraps around
  refreshSetPanel();
}

// Hold a arrow button to keep scrolling
let holdDelay, holdRepeat;
function stopHold() { clearTimeout(holdDelay); clearInterval(holdRepeat); }
document.querySelectorAll(".step").forEach((b) => {
  const unit = b.dataset.unit;
  const dir = Number(b.dataset.dir);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    step(unit, dir);
    holdDelay = setTimeout(() => {
      holdRepeat = setInterval(() => step(unit, dir), 90);
    }, 400);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, stopHold));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});

// Quick pick buttons
document.querySelectorAll(".chip").forEach((b) =>
  b.addEventListener("click", () => {
    const mins = Number(b.dataset.min);
    setVals.h = Math.floor(mins / 60);
    setVals.m = mins % 60;
    setVals.s = 0;
    refreshSetPanel();
  })
);

function confirmSet() {
  const total = setVals.h * 3600 + setVals.m * 60 + setVals.s;
  if (total <= 0) return;
  let custom = presets.find((p) => p.name === "Custom");
  if (!custom) { custom = { name: "Custom", seconds: total, kind: "focus" }; presets.push(custom); }
  custom.seconds = total;
  loadPreset(custom);
  closeSetPanel();
  tick();
}

btnSet.addEventListener("click", openSetPanel);
$("setCancel").addEventListener("click", closeSetPanel);
setOk.addEventListener("click", confirmSet);
document.addEventListener("keydown", (e) => {
  if (setPanel.hidden) return;
  if (e.key === "Enter") confirmSet();
  else if (e.key === "Escape") closeSetPanel();
});

// ---------- Alarm sound (made by the browser, no audio file needed) ----------
let audioCtx = null;
let alarmMaster = null;

function unlockAudio() {   // browsers only allow sound after you have tapped the page once
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function stopAlarm() {
  if (alarmMaster) { alarmMaster.disconnect(); alarmMaster = null; }
}

function playAlarm() {
  if (!audioCtx) return;
  stopAlarm();
  alarmMaster = audioCtx.createGain();
  alarmMaster.gain.value = 0.4;
  alarmMaster.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime + 0.05;
  for (let round = 0; round < 4; round++) {        // 4 rounds of 3 beeps
    for (let k = 0; k < 3; k++) {
      const start = t0 + round * 2 + k * 0.4;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(1, start + 0.02);
      g.gain.linearRampToValueAtTime(0, start + 0.25);
      osc.connect(g);
      g.connect(alarmMaster);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  }
}

// First tap unlocks sound; any tap silences a ringing alarm
document.addEventListener("pointerdown", () => { unlockAudio(); stopAlarm(); });

// ---------- Keep screen awake (Screen Wake Lock) ----------
var wakeLock, wakeLockPending, wakeLockRetryAt;

function wantWakeLock() {
  // awake while a timer or stopwatch runs, and while showing the desk clock
  return timer.running || sw.running || (mode === "clock" && settings.keepAwakeInClock);
}

async function syncWakeLock() {
  const out = $("infoAwake");
  if (!("wakeLock" in navigator)) { out.textContent = "N/A"; return; }
  const want = wantWakeLock();
  if (want && !wakeLock && !wakeLockPending && document.visibilityState === "visible"
      && Date.now() >= (wakeLockRetryAt || 0)) {
    wakeLockPending = true;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (err) {
      wakeLockRetryAt = Date.now() + 5000;   // e.g. battery saver said no; retry in 5 s
    }
    wakeLockPending = false;
  } else if (!want && wakeLock) {
    try { await wakeLock.release(); } catch (err) {}
    wakeLock = null;
  }
  out.textContent = wakeLock ? "ON" : "OFF";
}

// ---------- Full-screen button ----------
const btnFull = $("btnFull");
if (!document.fullscreenEnabled) btnFull.hidden = true;
btnFull.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock("landscape"); } catch (err) {}
      }
    }
  } catch (err) {
    console.log("Full screen not available:", err);
  }
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
    try { screen.orientation.unlock(); } catch (err) {}
  }
});

// ---------- Daily stats (saved on this device only) ----------
var statsData;                                   // loaded the first time it is needed
const STATS_KEY = "focusDeskClock.stats";        // settings will use a different key

function dayKey(date) {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}
function getStats() {
  if (!statsData) {
    try { statsData = JSON.parse(localStorage.getItem(STATS_KEY)) || {}; }
    catch (err) { statsData = {}; }
  }
  return statsData;
}
function saveStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(getStats())); } catch (err) {}
}
function todayStats() {
  const all = getStats();
  const key = dayKey(new Date());                // a new day starts at 0 automatically
  if (!all[key]) all[key] = { focus: 0, focusMs: 0, breaks: 0 };
  return all[key];
}
function recordSession(kind, ms) {
  const d = todayStats();
  if (kind === "focus") { d.focus++; d.focusMs += ms; } else { d.breaks++; }
  saveStats();
}

// ---------- Stats panel ----------
const statsPanel = $("statsPanel");
const statsReset = $("statsReset");
let resetTimeout;

function resetConfirmOff() {
  clearTimeout(resetTimeout);
  statsReset.textContent = "Reset today";
  statsReset.classList.remove("confirm");
}
function openStats() {
  const d = todayStats();
  $("stFocus").textContent = d.focus;
  $("stTime").textContent = formatHMSFloor(d.focusMs);
  $("stBreaks").textContent = d.breaks;
  resetConfirmOff();
  statsPanel.hidden = false;
}
function closeStats() { resetConfirmOff(); statsPanel.hidden = true; }

$("btnStats").addEventListener("click", openStats);
$("statsClose").addEventListener("click", closeStats);
statsReset.addEventListener("click", () => {
  if (!statsReset.classList.contains("confirm")) {       // first tap: ask to confirm
    statsReset.textContent = "Tap again to confirm";
    statsReset.classList.add("confirm");
    resetTimeout = setTimeout(resetConfirmOff, 3000);
    return;
  }
  const all = getStats();                                // second tap: reset today only
  delete all[dayKey(new Date())];
  saveStats();
  openStats();
  tick();
});

// ---------- Offline support: register the service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.log("Service worker:", err));
  });
}

// ---------- Welcome tour (shown once, replay with the ? button) ----------
const TOUR_KEY = "focusDeskClock.tourDone";
const tourSlides = [
  { title: "Welcome to Focus Desk Clock",
    text: "Turn any phone or tablet into a desk clock and focus timer. This quick tour takes about 20 seconds." },
  { title: "Three modes",
    text: "Use the tabs at the top. CLOCK shows the time. TIMER counts down. STOPWATCH counts up." },
  { title: "Start a focus session",
    text: "In Timer mode, tap Change to pick Focus (90 min), Short Break (10 min) or Long Break (20 min), or tap Set to choose your own time. Then press Start. When time is up you will hear an alarm. Tap anywhere to silence it." },
  { title: "Make it a real desk clock",
    text: "Tap the corner icon for full screen. Plug your phone in, because the screen stays on while the clock or a timer runs. In Chrome, open the menu and choose Install app so it opens without browser bars. Tap the ? button any time to see this again." },
  { title: "Why this exists",
    text: "A desk deserves a clock that feels like it belongs there: pure black, big white numbers, nothing blinking at you. And focus works best in whole sessions, like 90 minutes of deep work followed by a real break. I could not find a timer that felt right and did not want to buy one, so I turned an old phone into exactly that." },
  { title: "Built by Tanishq Shivasharan",
    text: "I built this from an old phone and the skills I have, and it is still growing. Contributions are very welcome. Tap the GitHub logo to open the project and join in.",
    link: "https://github.com/Tanishq747Shivasharan/focus-desk-clock" },
];
const tourEl = $("tour");
let tourIndex = 0;

function showTourSlide() {
  const s = tourSlides[tourIndex];
  $("tourTitle").textContent = s.title;
  $("tourText").textContent = s.text;
  const link = $("tourLink");
  link.hidden = !s.link;
  if (s.link) link.href = s.link;
  $("tourStep").textContent = (tourIndex + 1) + " / " + tourSlides.length;
  $("tourNext").textContent = tourIndex === tourSlides.length - 1 ? "Get started" : "Next";
  $("tourSkip").hidden = tourIndex === tourSlides.length - 1;
  const dots = $("tourDots");
  dots.textContent = "";
  tourSlides.forEach((_, i) => {
    const d = document.createElement("span");
    if (i === tourIndex) d.className = "on";
    dots.appendChild(d);
  });
}
function openTour() { tourIndex = 0; showTourSlide(); tourEl.hidden = false; }
function closeTour() {
  tourEl.hidden = true;
  try { localStorage.setItem(TOUR_KEY, "1"); } catch (err) {}
}
function nextTour() {
  if (tourIndex >= tourSlides.length - 1) { closeTour(); return; }
  tourIndex++;
  showTourSlide();
}

$("tourNext").addEventListener("click", nextTour);
$("tourSkip").addEventListener("click", closeTour);
$("btnHelp").addEventListener("click", openTour);
document.addEventListener("keydown", (e) => {
  if (tourEl.hidden) return;
  if (e.key === "Enter" || e.key === "ArrowRight") nextTour();
  else if (e.key === "Escape") closeTour();
});

let tourSeen = false;
try { tourSeen = localStorage.getItem(TOUR_KEY) === "1"; } catch (err) {}
if (!tourSeen) openTour();
