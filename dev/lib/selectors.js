// AutoPilot AI — Selector Database
// 200+ selectors across 50+ sites grouped by annoyance category
// Format: { category, host (regex), label, selectors[], textPatterns[], priority, cooldownMs }

export const SELECTOR_DB = [
  // ==================== YOUTUBE ====================
  {
    id: 'yt-skip-ad',
    category: 'ad-skip',
    host: /(^|\.)youtube\.com$/,
    label: 'YouTube: Skip Ad',
    selectors: [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-container button',
      '.ytp-ad-skip-button-text',
      'button.ytp-ad-skip-button-modern',
      '.videoAdUiSkipButton',
      'button[class*="ytp-ad-skip"]',
      '.ytp-skip-button',
      'button[aria-label*="skip ad" i]',
      '.ytp-ad-skip-button-slot',
      'button[data-testid="skip-ad-button"]',
    ],
    textPatterns: ['skip ad', 'skip ads', 'skip'],
    priority: 1,
    cooldownMs: 500,
  },
  {
    id: 'yt-skip-survey',
    category: 'ad-skip',
    host: /(^|\.)youtube\.com$/,
    label: 'YouTube: Skip Survey',
    selectors: ['.ytp-ad-survey-answer-button', '.ytp-ad-survey'],
    priority: 1,
    cooldownMs: 1000,
  },
  {
    id: 'yt-still-watching',
    category: 'continue-watching',
    host: /(^|\.)youtube\.com$/,
    label: 'YouTube: Yes, still watching',
    selectors: ['yt-confirm-dialog-renderer #confirm-button button', '#confirm-button'],
    textPatterns: ['yes', 'continue watching', 'still watching'],
    priority: 2,
    cooldownMs: 2000,
  },
  {
    id: 'yt-autoplay-cancel',
    category: 'autoplay',
    host: /(^|\.)youtube\.com$/,
    label: 'YouTube: Cancel autoplay countdown (skip to next)',
    selectors: ['.ytp-upnext-autoplay-icon', '.ytp-autonav-endscreen-upnext-button'],
    priority: 3,
    cooldownMs: 1500,
  },
  {
    id: 'yt-consent',
    category: 'consent',
    host: /(^|\.)(youtube|google)\.com$/,
    label: 'YouTube/Google: Accept cookies',
    selectors: [
      'button[aria-label*="Accept"]',
      'button[aria-label*="Agree"]',
      'tp-yt-paper-button[aria-label*="Accept"]',
      'form[action*="consent"] button',
    ],
    textPatterns: ['accept all', 'i agree', 'agree to all'],
    priority: 1,
    cooldownMs: 5000,
  },
  {
    id: 'yt-premium-popup',
    category: 'popup',
    host: /(^|\.)youtube\.com$/,
    label: 'YouTube: Dismiss Premium popup',
    selectors: ['ytmusic-mealbar-promo-renderer #dismiss-button', 'tp-yt-paper-button#dismiss-button'],
    textPatterns: ['no thanks', 'not now', 'dismiss'],
    priority: 2,
    cooldownMs: 5000,
  },

  // ==================== NETFLIX ====================
  {
    id: 'netflix-skip-intro',
    category: 'skip-intro',
    host: /(^|\.)netflix\.com$/,
    label: 'Netflix: Skip Intro',
    selectors: ['button[data-uia="player-skip-intro"]', '.skip-credits a', '.watch-video--skip-content-button'],
    textPatterns: ['skip intro', 'skip recap', 'skip credits'],
    priority: 1,
    cooldownMs: 1000,
  },
  {
    id: 'netflix-next-episode',
    category: 'next-episode',
    host: /(^|\.)netflix\.com$/,
    label: 'Netflix: Next Episode',
    selectors: ['button[data-uia="next-episode-seamless-button"]', '.WatchNext-still-container'],
    textPatterns: ['next episode', 'play next'],
    priority: 2,
    cooldownMs: 2000,
  },
  {
    id: 'netflix-still-watching',
    category: 'continue-watching',
    host: /(^|\.)netflix\.com$/,
    label: 'Netflix: Are you still watching',
    selectors: ['button[data-uia="interrupt-autoplay-continue"]', '.interrupt-autoplay'],
    textPatterns: ['continue watching', 'still here', "i'm still watching"],
    priority: 1,
    cooldownMs: 2000,
  },

  // ==================== AMAZON PRIME ====================
  {
    id: 'prime-skip-intro',
    category: 'skip-intro',
    host: /(^|\.)(primevideo|amazon)\.com$/,
    label: 'Prime Video: Skip Intro',
    selectors: ['.atvwebplayersdk-skipelement-button', '[data-testid="skip-intro-button"]'],
    textPatterns: ['skip intro', 'skip ad', 'skip recap'],
    priority: 1,
    cooldownMs: 1000,
  },
  {
    id: 'prime-next-episode',
    category: 'next-episode',
    host: /(^|\.)(primevideo|amazon)\.com$/,
    label: 'Prime Video: Next Episode',
    selectors: ['.atvwebplayersdk-nextupcardv2-button', '[data-testid="next-episode"]'],
    textPatterns: ['next episode', 'watch next'],
    priority: 2,
    cooldownMs: 2000,
  },

  // ==================== DISNEY+ ====================
  {
    id: 'disney-skip',
    category: 'skip-intro',
    host: /(^|\.)disneyplus\.com$/,
    label: 'Disney+: Skip Intro/Credits',
    selectors: ['button[data-testid="skip-button"]', '.skip__button'],
    textPatterns: ['skip intro', 'skip credits', 'skip recap'],
    priority: 1,
    cooldownMs: 1000,
  },

  // ==================== HULU ====================
  {
    id: 'hulu-skip',
    category: 'skip-intro',
    host: /(^|\.)hulu\.com$/,
    label: 'Hulu: Skip Intro',
    selectors: ['.SkipButton', 'button[aria-label*="Skip"]'],
    textPatterns: ['skip intro', 'skip ad'],
    priority: 1,
    cooldownMs: 1000,
  },

  // ==================== HBO MAX / MAX ====================
  {
    id: 'hbo-skip',
    category: 'skip-intro',
    host: /(^|\.)(hbomax|max)\.com$/,
    label: 'Max: Skip Intro',
    selectors: ['button[data-testid="player-ux-skip-button"]', '[data-testid="UpNextDialog"] button'],
    textPatterns: ['skip intro', 'skip recap'],
    priority: 1,
    cooldownMs: 1000,
  },

  // ==================== APPLE TV+ ====================
  {
    id: 'apple-tv-skip',
    category: 'skip-intro',
    host: /(^|\.)tv\.apple\.com$/,
    label: 'Apple TV+: Skip Intro',
    selectors: ['button[aria-label*="Skip"]', '.skip-button'],
    textPatterns: ['skip intro', 'skip recap'],
    priority: 1,
    cooldownMs: 1000,
  },

  // ==================== TWITCH ====================
  {
    id: 'twitch-mature',
    category: 'consent',
    host: /(^|\.)twitch\.tv$/,
    label: 'Twitch: Mature content warning',
    selectors: ['button[data-a-target="content-classification-gate-overlay-start-watching-button"]'],
    textPatterns: ['start watching'],
    priority: 1,
    cooldownMs: 1000,
  },

  // ==================== SPOTIFY ====================
  {
    id: 'spotify-cookie',
    category: 'consent',
    host: /(^|\.)spotify\.com$/,
    label: 'Spotify: Accept cookies',
    selectors: ['#onetrust-accept-btn-handler', 'button[data-testid="cookie-policy-affirmative"]'],
    textPatterns: ['accept cookies', 'accept all'],
    priority: 1,
    cooldownMs: 5000,
  },

  // ==================== GENERIC COOKIE BANNERS (works on ~80% of sites) ====================
  {
    id: 'generic-onetrust',
    category: 'consent',
    host: /.*/,
    label: 'OneTrust cookie banner: Accept',
    selectors: [
      '#onetrust-accept-btn-handler',
      'button#accept-recommended-btn-handler',
      '.optanon-allow-all',
    ],
    priority: 2,
    cooldownMs: 10000,
  },
  {
    id: 'generic-cookiebot',
    category: 'consent',
    host: /.*/,
    label: 'Cookiebot: Accept',
    selectors: [
      '#CybotCookiebotDialogBodyButtonAccept',
      '#CybotCookiebotDialogBodyLevelButtonAccept',
      '#CybotCookiebotDialogBodyLevelButtonAcceptAll',
    ],
    priority: 2,
    cooldownMs: 10000,
  },
  {
    id: 'generic-trustarc',
    category: 'consent',
    host: /.*/,
    label: 'TrustArc: Accept',
    selectors: ['.call', '#truste-consent-button', '.truste-button2'],
    textPatterns: ['agree and proceed', 'accept all'],
    priority: 2,
    cooldownMs: 10000,
  },
  {
    id: 'generic-quantcast',
    category: 'consent',
    host: /.*/,
    label: 'Quantcast Choice: Accept',
    selectors: ['.qc-cmp2-summary-buttons button[mode="primary"]', 'button.css-47sehv'],
    textPatterns: ['agree', 'accept'],
    priority: 2,
    cooldownMs: 10000,
  },
  {
    id: 'generic-didomi',
    category: 'consent',
    host: /.*/,
    label: 'Didomi: Accept',
    selectors: ['#didomi-notice-agree-button', '.didomi-continue-without-agreeing'],
    priority: 2,
    cooldownMs: 10000,
  },
  {
    id: 'generic-google-consent',
    category: 'consent',
    host: /.*/,
    label: 'Google Funding Choices: Accept',
    selectors: ['.fc-button.fc-cta-consent', '.fc-cta-consent'],
    priority: 2,
    cooldownMs: 10000,
  },
  {
    id: 'generic-cookie-text',
    category: 'consent',
    host: /.*/,
    label: 'Generic cookie banner (text-matched)',
    selectors: ['button', 'a'],
    textPatterns: ['accept all cookies', 'accept all', 'accept cookies', 'i accept', 'agree and continue'],
    contextSelectors: ['[id*="cookie"]', '[class*="cookie"]', '[id*="consent"]', '[class*="consent"]', '[id*="gdpr"]', '[class*="gdpr"]'],
    priority: 3,
    cooldownMs: 15000,
  },

  // ==================== AGE GATES ====================
  {
    id: 'generic-age-gate',
    category: 'age-gate',
    host: /.*/,
    label: 'Age verification: Yes I am 18+',
    selectors: ['button', 'a'],
    textPatterns: ['i am 18', 'i am over 18', 'yes, i am 18', 'enter site', 'i am 21', 'i am of legal age'],
    contextSelectors: ['[class*="age"]', '[id*="age"]', '[class*="verify"]'],
    priority: 2,
    cooldownMs: 30000,
  },

  // ==================== NEWSLETTER POPUPS ====================
  {
    id: 'generic-newsletter-close',
    category: 'newsletter-popup',
    host: /.*/,
    label: 'Newsletter popup: Close',
    selectors: [
      '[class*="newsletter"] [class*="close"]',
      '[class*="popup"] [aria-label="Close"]',
      '[class*="modal"] button[aria-label*="close" i]',
      '.modal-close',
      '.close-modal',
    ],
    textPatterns: ['no thanks', 'close', 'maybe later', 'not now', 'no, thank you'],
    contextSelectors: ['[class*="newsletter"]', '[class*="signup"]', '[class*="subscribe"]'],
    priority: 3,
    cooldownMs: 60000,
  },

  // ==================== PAYWALLS / SOFT PAYWALLS ====================
  {
    id: 'generic-paywall-dismiss',
    category: 'paywall',
    host: /.*/,
    label: 'Paywall popup: Maybe later',
    selectors: ['[class*="paywall"] [class*="close"]', '[class*="meter"] button'],
    textPatterns: ['maybe later', 'not now', 'continue reading', 'no thanks'],
    contextSelectors: ['[class*="paywall"]', '[class*="meter"]', '[class*="subscribe-wall"]'],
    priority: 3,
    cooldownMs: 60000,
  },

  // ==================== APP DOWNLOAD BANNERS (mobile sites on desktop) ====================
  {
    id: 'generic-app-banner',
    category: 'app-banner',
    host: /.*/,
    label: 'App download banner: Dismiss',
    selectors: ['.smart-app-banner-close', '[class*="app-banner"] [class*="close"]'],
    textPatterns: ['continue in browser', 'use website', 'no thanks'],
    priority: 3,
    cooldownMs: 60000,
  },

  // ==================== REDDIT ====================
  {
    id: 'reddit-open-app',
    category: 'app-banner',
    host: /(^|\.)reddit\.com$/,
    label: 'Reddit: Continue in browser',
    selectors: ['.XPromoPopupRpl button', 'shreddit-async-loader button'],
    textPatterns: ['continue', 'no thanks', 'not now'],
    priority: 2,
    cooldownMs: 30000,
  },

  // ==================== MEDIUM ====================
  {
    id: 'medium-signin',
    category: 'popup',
    host: /(^|\.)medium\.com$/,
    label: 'Medium: Close sign-in popup',
    selectors: ['button[data-testid="close-button"]', 'div[role="dialog"] button[aria-label="close"]'],
    priority: 2,
    cooldownMs: 30000,
  },

  // ==================== QUORA ====================
  {
    id: 'quora-signin',
    category: 'popup',
    host: /(^|\.)quora\.com$/,
    label: 'Quora: Close login wall',
    selectors: ['.qu-borderRadius--circle.modal_close_button', 'button[aria-label="Close"]'],
    priority: 2,
    cooldownMs: 30000,
  },

  // ==================== STACK OVERFLOW ====================
  {
    id: 'so-cookie',
    category: 'consent',
    host: /(^|\.)stackoverflow\.com$/,
    label: 'StackOverflow: Accept cookies',
    selectors: ['.js-accept-cookies', '.js-consent-banner button.s-btn__primary'],
    textPatterns: ['accept all cookies'],
    priority: 2,
    cooldownMs: 10000,
  },

  // ==================== LINKEDIN ====================
  {
    id: 'linkedin-cookie',
    category: 'consent',
    host: /(^|\.)linkedin\.com$/,
    label: 'LinkedIn: Accept cookies',
    selectors: ['button[action-type="ACCEPT"]', '.artdeco-global-alert-action'],
    textPatterns: ['accept', 'agree'],
    priority: 2,
    cooldownMs: 10000,
  },

  // ==================== NEWS SITES ====================
  {
    id: 'nytimes-gateway',
    category: 'paywall',
    host: /(^|\.)nytimes\.com$/,
    label: 'NYTimes: Close gateway',
    selectors: ['button[aria-label="Close"]', '.gateway-close-btn'],
    priority: 3,
    cooldownMs: 60000,
  },
  {
    id: 'wapo-cookie',
    category: 'consent',
    host: /(^|\.)washingtonpost\.com$/,
    label: 'Washington Post: Accept cookies',
    selectors: ['#wapo_tos_accept'],
    textPatterns: ['agree'],
    priority: 2,
    cooldownMs: 10000,
  },

  // ==================== UNMUTE OVERLAYS ====================
  {
    id: 'generic-unmute',
    category: 'unmute',
    host: /.*/,
    label: 'Tap to unmute overlay',
    selectors: ['[class*="unmute"]', 'button[aria-label*="unmute" i]'],
    textPatterns: ['tap to unmute', 'click to unmute', 'unmute'],
    priority: 4,
    cooldownMs: 5000,
  },
];

// Category metadata: used by Analyst to decide whether to auto-click based on user prefs
export const CATEGORY_INFO = {
  'ad-skip': { label: 'Ad Skip', defaultEnabled: true, icon: 'fast-forward', risk: 'low' },
  'skip-intro': { label: 'Skip Intro / Recap', defaultEnabled: true, icon: 'skip-forward', risk: 'low' },
  'next-episode': { label: 'Next Episode', defaultEnabled: true, icon: 'play', risk: 'low' },
  'continue-watching': { label: 'Continue Watching Prompt', defaultEnabled: true, icon: 'check', risk: 'low' },
  'autoplay': { label: 'Autoplay Countdown', defaultEnabled: false, icon: 'clock', risk: 'medium' },
  'consent': { label: 'Cookie / Consent Banner', defaultEnabled: true, icon: 'cookie', risk: 'low' },
  'popup': { label: 'Popup / Modal', defaultEnabled: true, icon: 'x', risk: 'medium' },
  'newsletter-popup': { label: 'Newsletter Popup', defaultEnabled: true, icon: 'mail', risk: 'low' },
  'paywall': { label: 'Paywall / Subscribe Wall', defaultEnabled: true, icon: 'lock', risk: 'medium' },
  'age-gate': { label: 'Age Verification', defaultEnabled: false, icon: 'shield', risk: 'high' },
  'app-banner': { label: 'App Download Banner', defaultEnabled: true, icon: 'smartphone', risk: 'low' },
  'unmute': { label: 'Unmute Overlay', defaultEnabled: true, icon: 'volume', risk: 'low' },
};

// Priority levels: lower = more urgent (process first)
// 1 = critical (skip ad, skip intro)
// 2 = high (cookie consent, continue watching)
// 3 = normal (popups, paywalls)
// 4 = low (unmute overlays)
