# AutoPilot AI — Agent Guide

This document explains the project structure, conventions, and workflows for AI coding agents working on AutoPilot AI.

## Project Overview

AutoPilot AI is a Chrome Extension (Manifest V3) that auto-clicks annoying buttons on the web — Skip Ad, Skip Intro, cookie banners, popups, newsletter signups, paywalls, app banners, and more. It runs a 4-agent swarm entirely inside the browser with **zero LLM calls, zero API keys, and zero network requests**.

- **Author**: Sathish Lella
- **Day**: 10 of 100 Days, 100 AI Agents
- **License**: MIT
- **Language**: All code and docs are in English

## Technology Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** — no frameworks, no bundler, no build step
- **HTML/CSS** for `popup.html` and `dashboard.html`
- **Web Speech API** for on-device voice commands
- **chrome.storage.local** for stats and user preferences

## Architecture & File Organization

```
Day-10-AutoPilot/
├── manifest.json          # MV3 manifest
├── background.js          # Service worker — Supervisor agent (stats persistence)
├── content.js             # Bundled content script — Scout + Analyst + Executor + Voice
├── popup.html / popup.js  # Toolbar popup UI
├── dashboard.html / dashboard.js  # Full-page stats dashboard
├── dev/
│   ├── lib/               # Canonical modular ES module source of each agent
│   │   ├── scout.js       # DOM watcher / candidate finder
│   │   ├── analyst.js     # Decision engine (prefs, cooldowns, bans)
│   │   ├── executor.js    # Smart clicker + toast UI
│   │   ├── supervisor.js  # Stats engine (maps to background.js logic)
│   │   ├── voice.js       # Web Speech API controller
│   │   └── selectors.js   # Selector database + category metadata
│   └── test-autopilot.mjs # Standalone Node.js validation test
└── icons/                 # Extension icons (16, 32, 48, 128)
```

### Important: The `content.js` Bundle Rule

Chrome MV3 content scripts do **not** support ES modules natively, so `content.js` is a **self-contained, manually bundled IIFE** that inlines everything. The `dev/lib/*.js` files are the canonical, readable source of truth for each agent. When you change logic in `dev/lib/`, you must **manually port the changes into `content.js`** (or vice versa if the fix is urgent). Keep the two in sync.

### The 4-Agent Swarm

1. **Scout** (`scout.js` / inlined in `content.js`)
   - Watches the DOM with `MutationObserver` + interval scans
   - Matches elements against `SELECTOR_DB` (35+ rules, 50+ sites)
   - Emits candidate batches sorted by priority

2. **Analyst** (`analyst.js` / inlined in `content.js`)
   - Decides `click` vs `skip` vs `defer` for each candidate
   - Factors: category toggles, site pause, rule cooldown, user undo bans, high-risk opt-ins

3. **Executor** (`executor.js` / inlined in `content.js`)
   - Performs a "smart click" (synthetic pointer/mouse events + native `.click()`)
   - Shows a bottom-right toast with a 5-second undo window
   - Calculates conservative "time saved" per category

4. **Supervisor** (`supervisor.js` / `background.js`)
   - Persists stats to `chrome.storage.local`
   - Aggregates by category and site, computes daily averages, undo rate
   - Exposes derived stats to popup/dashboard via message passing

### Voice Controller

- Uses the browser's Web Speech API (`webkitSpeechRecognition`)
- Because microphone permissions require a real in-page user gesture, enabling voice injects a floating pill that the user must click
- Commands: skip, pause, play, next, previous, mute, unmute, louder, quieter, fullscreen

## Build and Test Commands

There is **no build step** for the extension. To load it:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `Day-10-AutoPilot/` folder

### Running Tests

A standalone Node.js test validates the Analyst and Supervisor logic:

```bash
node dev/test-autopilot.mjs
```

- Scout is **not** covered because it requires a real DOM
- The test asserts priority sorting, cooldown enforcement, ban learning, category toggles, and stats math

## Code Style Guidelines

- **No external dependencies** — keep it vanilla JS
- **No transpiler / no bundler** — code must run directly in Chrome
- **Semicolons**: present but not strictly enforced
- **Quotes**: single quotes in JS, double quotes in HTML
- **Indentation**: 2 spaces
- **Comments**: concise, explain the *why* not the obvious
- **Error handling**: wrap DOM queries and `chrome.*` calls in `try/catch` or guard with `chrome.runtime.lastError` checks
- **ES modules**: allowed in `dev/lib/` and `dev/test-autopilot.mjs`, but **not** in `content.js` (must be IIFE)

## How to Add or Modify Rules

Rules live in two places that must stay in sync:

- `dev/lib/selectors.js` (canonical source)
- `content.js` (bundled `SELECTOR_DB` array)

A rule object looks like this:

```js
{
  id: 'unique-rule-id',
  category: 'ad-skip',        // must exist in CATEGORY_INFO
  host: /(^|\.)youtube\.com$/,
  label: 'YouTube: Skip Ad',
  selectors: ['.ytp-ad-skip-button'],
  textPatterns: ['skip ad'],  // optional
  contextSelectors: ['...'],  // optional parent constraints
  priority: 1,                // lower = higher urgency
  cooldownMs: 500,
}
```

Categories are defined in `CATEGORY_INFO` with `defaultEnabled`, `risk` (`low` | `medium` | `high`), and a label. If you add a new category, mirror it in:
- `popup.js` (`CATEGORY_INFO` object)
- `dashboard.js` (`CATEGORY_LABELS` object)

## Security & Privacy Considerations

- **Zero network requests** — do not add `fetch()`, `XMLHttpRequest`, or external script tags
- **Zero telemetry** — do not add analytics or error reporting that phones home
- **Storage**: only `chrome.storage.local` is used; no syncing to user accounts
- **Host permissions**: `<all_urls>` is required for universal cookie-banner/popup coverage
- **Voice**: runs entirely on-device via Web Speech API
- If you add a new permission to `manifest.json`, document why in the commit/comment

## Common Tasks

### Fix a broken selector on a specific site
1. Update the `selectors` array in the relevant rule in `dev/lib/selectors.js`
2. Apply the same fix to the matching rule in `content.js`
3. Reload the extension in `chrome://extensions` and test on the target site

### Add a new site or annoyance type
1. Add a new rule to `SELECTOR_DB` in both `dev/lib/selectors.js` and `content.js`
2. If it's a new category, add it to `CATEGORY_INFO` in both files, plus `popup.js` and `dashboard.js`
3. Update the cooldown and priority based on how intrusive the action is

### Change stats logic
- Modify `dev/lib/supervisor.js` and `background.js` in parallel
- `background.js` uses `STORAGE_KEY = 'autopilot_stats_v1'`; `supervisor.js` uses `'autopilot_state_v1'` for historical reasons — do not change these keys unless you are writing a migration

### Run the validation test after logic changes
```bash
node dev/test-autopilot.mjs
```
Expected output: `=== ALL TESTS PASSED ===`

## Deployment Process

The extension is designed to be **Chrome Web Store ready** as-is:
- Single-file content script
- Zero external dependencies
- Privacy-first manifest

There is no CI/CD pipeline. To release:
1. Zip the entire `Day-10-AutoPilot/` folder
2. Upload the zip to the Chrome Web Store Developer Dashboard
3. Ensure `manifest.json` version is bumped
