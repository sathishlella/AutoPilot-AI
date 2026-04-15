# AutoPilot AI

**Day 10 of 100 Days, 100 AI Agents** — Autonomous browser agent that auto-clicks the annoying buttons across the web so you never have to. Built as a Chrome Extension with a 4-agent swarm architecture.

## What It Does

Watches every page you visit in real-time and automatically handles:

- **YouTube**: Skip Ad button, "still watching?" prompts, Premium popups, cookie consent
- **Netflix / Prime Video / Disney+ / Hulu / Max / Apple TV+**: Skip Intro, Skip Recap, Next Episode, "Are you still watching?"
- **Spotify / Twitch**: Cookie banners, mature content gates
- **Cookie banners** on ~80% of all sites: OneTrust, Cookiebot, TrustArc, Quantcast, Didomi, Google Funding Choices
- **Popups & modals**: Newsletter signups, paywalls, app download banners, Medium / Quora sign-in walls
- **Reddit**: "Open in app" banner
- **News sites**: NYTimes gateway, Washington Post consent
- **Stack Overflow / LinkedIn**: Cookie consent
- **Voice commands**: Say "skip", "pause", "next", "mute" from across the room

**The original use case**: You're listening to YouTube while in another room. An ad starts. Normally you'd have to walk over and click Skip Ad. AutoPilot does it for you, automatically, the moment the button appears.

## System Architecture — 4-Agent Swarm

```
                    PAGE LOADS
                        |
                        v
+-------------------+   +-------------------+   +-------------------+   +-------------------+
|   SCOUT           |-->|   ANALYST         |-->|   EXECUTOR        |-->|   SUPERVISOR      |
|   (zero LLM)      |   |   (zero LLM)      |   |   (zero LLM)      |   |   (zero LLM)      |
|                   |   |                   |   |                   |   |                   |
| MutationObserver  |   | Decision engine   |   | Smart click +     |   | Persists stats    |
| 35+ rules         |   | Site pause check  |   | undo toast        |   | Time saved calc   |
| 50+ sites         |   | Category prefs    |   | 5s undo window    |   | By category/site  |
| Visibility check  |   | Cooldown logic    |   |                   |   | Recent activity   |
| Priority sort     |   | Ban learning      |   |                   |   | Learning loop     |
+-------------------+   +-------------------+   +-------------------+   +-------------------+
                                                                              |
                                                                              v
                                                                     +------------------+
                                                                     | VOICE CONTROLLER |
                                                                     | Web Speech API   |
                                                                     | 10 commands      |
                                                                     +------------------+
```

**Anti-Wrapper Moat**: Zero LLM dependency anywhere. No API key. No network requests. No data collection. 100% local pattern matching against a hand-curated rule database. Privacy-first by design.

## Quick Start

1. Open `chrome://extensions` in Chrome (or any Chromium browser)
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked**
4. Select the `Day-10-AutoPilot/` folder
5. Pin the extension to your toolbar
6. Visit YouTube, Netflix, or any website with cookie banners — AutoPilot starts working immediately

The little green dot toast in the bottom-right corner confirms each action and gives you a 5-second undo window.

## Voice Commands

Click the AutoPilot icon → toggle **Voice commands** ON. Then from anywhere in the room, say:

- "skip" / "skip ad" / "skip intro" — clicks any visible skip button or seeks +10s
- "pause" / "stop" — pauses the video
- "play" / "resume" — resumes
- "next" / "next episode" — seeks +30s
- "previous" / "back" — seeks -30s
- "mute" / "unmute"
- "louder" / "quieter"
- "fullscreen"

Voice runs entirely on-device using the Web Speech API. Nothing is sent to any server.

## File Structure

```
Day-10-AutoPilot/
├── manifest.json          — Chrome MV3 manifest
├── content.js             — Bundled content script (Scout + Analyst + Executor + Voice)
├── background.js          — Service worker (Supervisor + stats persistence)
├── popup.html             — Toolbar popup
├── popup.js               — Popup logic
├── dashboard.html         — Full-page stats dashboard
├── dashboard.js           — Dashboard logic
├── lib/                   — Modular ES versions (scout, analyst, executor, supervisor, voice, selectors)
└── icons/                 — Extension icons (16, 32, 48, 128)
```

The `lib/` modules are the canonical, documented source of each agent. The `content.js` bundles them inline because Chrome MV3 content scripts don't support ES modules natively.

## Privacy

- Zero network requests
- Zero data collection
- Zero API keys
- Zero telemetry
- All stats stored in `chrome.storage.local` only
- Voice recognition uses the browser's built-in Web Speech API, on-device

## How It Saves Time

Each auto-click is mapped to a conservative seconds-saved estimate:

| Action              | Seconds saved |
|---------------------|---------------|
| Skip Intro          | 30s           |
| Cookie consent      | 8s            |
| Continue watching   | 6s            |
| Skip Ad             | 5s            |
| Newsletter popup    | 6s            |
| Paywall dismiss     | 7s            |

A typical user saves 5-15 minutes per day. Heavy streamers save 30-60 minutes per day.

## Selling It to Real Companies

This extension is structured to be Chrome Web Store ready:
- Single-file content script (no build step)
- Zero external dependencies
- Privacy-first manifest
- Persistent stats and undo audit trail
- Clear category opt-out controls

Ship to Chrome Web Store under freemium model: **Free** (current), **Pro $4.99/mo** (custom rules, sync across devices, team analytics, adds Firefox + Safari).

## License

MIT — Day 10 of 100 Days, 100 AI Agents Challenge by Sathish Lella.
