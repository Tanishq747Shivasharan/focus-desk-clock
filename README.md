# Focus Desk Clock

A minimalist desk clock, focus timer and stopwatch for Android phones and tablets.
It is a Progressive Web App (PWA): plain HTML, CSS and JavaScript, with no build step, no framework and no account.

Live app: https://focus-desk-clock.netlify.app

Developed and managed by **Tanishq Shivasharan**.

[![Contribute on GitHub](https://img.shields.io/badge/GitHub-Contribute-181717?logo=github)](https://github.com/Tanishq747Shivasharan/focus-desk-clock)

## Why I built this

I study, code and practise cybersecurity at my desk, and I wanted a proper timer to keep me
focused. I didn't have one.

**A desk deserves its own clock.** A phone or laptop is full of notifications and other apps.
A screen that does one job, showing the time and running the session, is easier to trust and
harder to wander away from. I wanted it to look like a piece of desk furniture rather than an
app: pure black, large white numerals readable from arm's length, one subtle cyan accent, and
no gradients, ads or clutter.

**Focus works in sessions.** Long, uninterrupted blocks of work followed by real breaks suit
studying and coding. So the app is built around them: a 90-minute focus session, 10 and 20
minute breaks, the end time shown at a glance, an alarm when time is up, and a daily count of
completed sessions so the day has a visible rhythm.

Ready-made desk timers exist, for example the
[Portronics Glowtime](https://www.portronics.com/products/glowtime), but I didn't want to
spend money on one. I had an old Android phone lying around, so I decided to build my own
using the skills I have today.

I started this project as a complete beginner. Setting up the terminal, understanding how a
web app is put together and putting it online were all new to me, and Focus Desk Clock is the
result of learning each of those things one step at a time. It is not perfect, and it is still
growing, but it is mine, it works, and it sits on my desk every day.

## Features

- Live date/time pill with ticking seconds (device clock, local timezone)
- Desk clock, countdown timer and stopwatch modes
- Presets: Focus 90 min, Short Break 10 min, Long Break 20 min, plus a custom time
- Drift-proof countdown (see "How it works")
- Alarm sound and a pulsing "TIME'S UP" message
- Daily stats (sessions, time focused, breaks) saved on the device
- Screen Wake Lock, full-screen button, installable and works offline
- First-run welcome tour for new users

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page structure: pill, display, controls, panels |
| `style.css` | All visual styling (colours are variables at the top) |
| `app.js` | All behaviour: clock, timer, stopwatch, stats, alarm, wake lock, tour |
| `sw.js` | Service worker: caches files so the app works offline |
| `manifest.webmanifest` | Makes the app installable (name, colours, icons, orientation) |
| `icons/` | App icons (192 and 512 px) |
| `docs/USER-GUIDE.md` | Guide for everyday users |

## Run it locally

Requires Python 3 (only to serve the files).

```bash
cd focus-desk-clock
python3 -m http.server 8000
```

Open **http://localhost:8000**. Use `localhost`, not `0.0.0.0`: browsers only allow
service workers, install and Wake Lock on secure origins, and `localhost` counts as secure.

## Deploy

The app is static, so any HTTPS static host works. It is currently hosted with Netlify Drop:
drag the project folder onto the site's Deploys page. The URL stays the same.
HTTPS is required for install, offline support and Wake Lock on phones.

## How it works

- **Accurate timer:** the countdown stores the exact moment it should end (`endAt`) and compares
  it with `Date.now()` on every tick. It does not count seconds, so it stays correct if the
  browser pauses background tabs. The stopwatch works the same way with a start timestamp.
- **Tick loop:** one `setInterval` runs 4 times per second to redraw the pill and display.
- **No horizontal shifting:** `font-variant-numeric: tabular-nums` makes every digit the same width.
- **Responsive sizing:** text uses `vw`/`vh` units and `min()`/`clamp()`, with safe-area padding
  for screen cutouts. No device-specific sizes are hardcoded.
- **Wake Lock:** requested while a timer or stopwatch runs, and in Clock mode.
  Shows `N/A` on browsers without the API.
- **Storage:** `localStorage` keys are `focusDeskClock.stats` (daily stats, keyed by date)
  and `focusDeskClock.tourDone` (welcome tour). Resetting stats never touches other keys.
- **Alarm:** generated with the Web Audio API (no audio files). Browsers only allow sound
  after a user tap, so the first tap on the page unlocks it.
- **Offline:** `sw.js` is network-first with a cache fallback. If you add new files, add them
  to `FILES` in `sw.js` and change `CACHE` from `v1` to `v2`.

## Browser support

Current Chrome, Edge, Brave and other Chromium browsers on Android and desktop.
Wake Lock, full screen and install support vary by browser; the app hides or labels
features that are not available.

## Roadmap (not built yet)

- Settings panel (12/24-hour switch, two-minute warning, sound and vibration toggles)
- Optional automatic Pomodoro transitions (focus, then break)
- Battery percentage where the browser exposes it
- App-level brightness slider
- Vibration on completion

## Author and contributions

**More contributions to this project are welcome!** Bug reports, ideas, design tweaks, new
features and documentation fixes all help, whether you are a beginner or an experienced developer.
Open an issue or pull request at https://github.com/Tanishq747Shivasharan/focus-desk-clock. Please keep the project dependency-free, keep the black
minimalist style, and test on a phone-sized landscape screen before submitting.


