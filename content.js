// AutoPilot AI — Content Script (bundled, runs on every page)
// Self-contained: includes the selector DB and all 4 agents inline
// Chrome MV3 content scripts can't use ES modules directly, so everything is inlined.

(function () {
  'use strict';
  if (window.__autopilotInstance) return; // prevent double-injection

  // ============================================================
  // SELECTOR DATABASE — 35+ rules covering 50+ sites
  // ============================================================
  const SELECTOR_DB = [
    // YouTube
    { id: 'yt-skip-ad', category: 'ad-skip', host: /(^|\.)youtube\.com$/, label: 'YouTube: Skip Ad', selectors: ['.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.ytp-skip-ad-button', '.ytp-ad-skip-button-container button', '.ytp-ad-skip-button-text', 'button.ytp-ad-skip-button-modern', '.videoAdUiSkipButton', 'button[class*="ytp-ad-skip"]', '.ytp-skip-button', 'button[aria-label*="skip ad" i]', '.ytp-ad-skip-button-slot', 'button[data-testid="skip-ad-button"]'], textPatterns: ['skip ad', 'skip ads', 'skip'], priority: 1, cooldownMs: 500 },
    { id: 'yt-skip-ad-overlay', category: 'ad-skip', host: /(^|\.)youtube\.com$/, label: 'YouTube: Skip Ad Overlay', selectors: ['.ytp-ad-overlay-close-button', '.ytp-ad-overlay-close-container button', '.ytp-ad-text-overlay .ytp-ad-overlay-close-button'], priority: 1, cooldownMs: 1000 },
    { id: 'yt-visit-advertiser-close', category: 'ad-skip', host: /(^|\.)youtube\.com$/, label: 'YouTube: Close ad card', selectors: ['.ytp-ad-feedback-dialog-close-button', '.ytp-flyout-cta-close-button'], priority: 2, cooldownMs: 2000 },
    { id: 'yt-skip-survey', category: 'ad-skip', host: /(^|\.)youtube\.com$/, label: 'YouTube: Skip Survey', selectors: ['.ytp-ad-survey-answer-button'], priority: 1, cooldownMs: 1000 },
    { id: 'yt-still-watching', category: 'continue-watching', host: /(^|\.)youtube\.com$/, label: 'YouTube: Still watching?', selectors: ['yt-confirm-dialog-renderer #confirm-button button', '#confirm-button'], textPatterns: ['yes', 'continue watching', 'still watching'], priority: 2, cooldownMs: 2000 },
    { id: 'yt-consent', category: 'consent', host: /(^|\.)(youtube|google)\.com$/, label: 'Google: Accept cookies', selectors: ['button[aria-label*="Accept"]', 'button[aria-label*="Agree"]', 'tp-yt-paper-button[aria-label*="Accept"]', 'form[action*="consent"] button'], textPatterns: ['accept all', 'i agree', 'agree to all'], priority: 1, cooldownMs: 5000 },
    { id: 'yt-premium-popup', category: 'popup', host: /(^|\.)youtube\.com$/, label: 'YouTube: Dismiss Premium popup', selectors: ['ytmusic-mealbar-promo-renderer #dismiss-button', 'tp-yt-paper-button#dismiss-button'], textPatterns: ['no thanks', 'not now', 'dismiss'], priority: 2, cooldownMs: 5000 },
    // Netflix
    { id: 'netflix-skip-intro', category: 'skip-intro', host: /(^|\.)netflix\.com$/, label: 'Netflix: Skip Intro', selectors: ['button[data-uia="player-skip-intro"]', '.skip-credits a', '.watch-video--skip-content-button'], textPatterns: ['skip intro', 'skip recap', 'skip credits'], priority: 1, cooldownMs: 1000 },
    { id: 'netflix-next-episode', category: 'next-episode', host: /(^|\.)netflix\.com$/, label: 'Netflix: Next Episode', selectors: ['button[data-uia="next-episode-seamless-button"]', '.WatchNext-still-container'], textPatterns: ['next episode', 'play next'], priority: 2, cooldownMs: 2000 },
    { id: 'netflix-still-watching', category: 'continue-watching', host: /(^|\.)netflix\.com$/, label: 'Netflix: Still watching?', selectors: ['button[data-uia="interrupt-autoplay-continue"]', '.interrupt-autoplay'], textPatterns: ['continue watching', 'still here', "i'm still watching"], priority: 1, cooldownMs: 2000 },
    // Prime Video
    { id: 'prime-skip-intro', category: 'skip-intro', host: /(^|\.)(primevideo|amazon)\.com$/, label: 'Prime Video: Skip Intro', selectors: ['.atvwebplayersdk-skipelement-button', '[data-testid="skip-intro-button"]'], textPatterns: ['skip intro', 'skip ad', 'skip recap'], priority: 1, cooldownMs: 1000 },
    { id: 'prime-next-episode', category: 'next-episode', host: /(^|\.)(primevideo|amazon)\.com$/, label: 'Prime Video: Next Episode', selectors: ['.atvwebplayersdk-nextupcardv2-button', '[data-testid="next-episode"]'], textPatterns: ['next episode', 'watch next'], priority: 2, cooldownMs: 2000 },
    // Disney+
    { id: 'disney-skip', category: 'skip-intro', host: /(^|\.)disneyplus\.com$/, label: 'Disney+: Skip Intro', selectors: ['button[data-testid="skip-button"]', '.skip__button'], textPatterns: ['skip intro', 'skip credits', 'skip recap'], priority: 1, cooldownMs: 1000 },
    // Hulu
    { id: 'hulu-skip', category: 'skip-intro', host: /(^|\.)hulu\.com$/, label: 'Hulu: Skip Intro', selectors: ['.SkipButton', 'button[aria-label*="Skip"]'], textPatterns: ['skip intro', 'skip ad'], priority: 1, cooldownMs: 1000 },
    // HBO/Max
    { id: 'hbo-skip', category: 'skip-intro', host: /(^|\.)(hbomax|max)\.com$/, label: 'Max: Skip Intro', selectors: ['button[data-testid="player-ux-skip-button"]'], textPatterns: ['skip intro', 'skip recap'], priority: 1, cooldownMs: 1000 },
    // Apple TV+
    { id: 'apple-tv-skip', category: 'skip-intro', host: /(^|\.)tv\.apple\.com$/, label: 'Apple TV+: Skip Intro', selectors: ['button[aria-label*="Skip"]'], textPatterns: ['skip intro', 'skip recap'], priority: 1, cooldownMs: 1000 },
    // Twitch
    { id: 'twitch-mature', category: 'consent', host: /(^|\.)twitch\.tv$/, label: 'Twitch: Mature content', selectors: ['button[data-a-target="content-classification-gate-overlay-start-watching-button"]'], textPatterns: ['start watching'], priority: 1, cooldownMs: 1000 },
    // Spotify
    { id: 'spotify-cookie', category: 'consent', host: /(^|\.)spotify\.com$/, label: 'Spotify: Accept cookies', selectors: ['#onetrust-accept-btn-handler', 'button[data-testid="cookie-policy-affirmative"]'], textPatterns: ['accept cookies', 'accept all'], priority: 1, cooldownMs: 5000 },
    // Generic cookie banners
    { id: 'generic-onetrust', category: 'consent', host: /.*/, label: 'OneTrust: Accept', selectors: ['#onetrust-accept-btn-handler', 'button#accept-recommended-btn-handler', '.optanon-allow-all'], priority: 2, cooldownMs: 10000 },
    { id: 'generic-cookiebot', category: 'consent', host: /.*/, label: 'Cookiebot: Accept', selectors: ['#CybotCookiebotDialogBodyButtonAccept', '#CybotCookiebotDialogBodyLevelButtonAccept', '#CybotCookiebotDialogBodyLevelButtonAcceptAll'], priority: 2, cooldownMs: 10000 },
    { id: 'generic-trustarc', category: 'consent', host: /.*/, label: 'TrustArc: Accept', selectors: ['.call', '#truste-consent-button', '.truste-button2'], textPatterns: ['agree and proceed', 'accept all'], priority: 2, cooldownMs: 10000 },
    { id: 'generic-quantcast', category: 'consent', host: /.*/, label: 'Quantcast: Accept', selectors: ['.qc-cmp2-summary-buttons button[mode="primary"]', 'button.css-47sehv'], textPatterns: ['agree', 'accept'], priority: 2, cooldownMs: 10000 },
    { id: 'generic-didomi', category: 'consent', host: /.*/, label: 'Didomi: Accept', selectors: ['#didomi-notice-agree-button'], priority: 2, cooldownMs: 10000 },
    { id: 'generic-google-consent', category: 'consent', host: /.*/, label: 'Google FC: Accept', selectors: ['.fc-button.fc-cta-consent', '.fc-cta-consent'], priority: 2, cooldownMs: 10000 },
    { id: 'generic-cookie-text', category: 'consent', host: /.*/, label: 'Generic cookie banner', selectors: ['button', 'a'], textPatterns: ['accept all cookies', 'accept all', 'accept cookies', 'i accept', 'agree and continue'], contextSelectors: ['[id*="cookie"]', '[class*="cookie"]', '[id*="consent"]', '[class*="consent"]', '[id*="gdpr"]', '[class*="gdpr"]'], priority: 3, cooldownMs: 15000 },
    // Age gates
    { id: 'generic-age-gate', category: 'age-gate', host: /.*/, label: 'Age verification', selectors: ['button', 'a'], textPatterns: ['i am 18', 'i am over 18', 'yes, i am 18', 'enter site', 'i am 21', 'i am of legal age'], contextSelectors: ['[class*="age"]', '[id*="age"]', '[class*="verify"]'], priority: 2, cooldownMs: 30000 },
    // Newsletter popups
    { id: 'generic-newsletter-close', category: 'newsletter-popup', host: /.*/, label: 'Newsletter popup: Close', selectors: ['[class*="newsletter"] [class*="close"]', '[class*="popup"] [aria-label="Close"]', '[class*="modal"] button[aria-label*="close" i]', '.modal-close', '.close-modal'], textPatterns: ['no thanks', 'close', 'maybe later', 'not now', 'no, thank you'], contextSelectors: ['[class*="newsletter"]', '[class*="signup"]', '[class*="subscribe"]'], priority: 3, cooldownMs: 60000 },
    // Paywalls
    { id: 'generic-paywall-dismiss', category: 'paywall', host: /.*/, label: 'Paywall: Maybe later', selectors: ['[class*="paywall"] [class*="close"]', '[class*="meter"] button'], textPatterns: ['maybe later', 'not now', 'continue reading', 'no thanks'], contextSelectors: ['[class*="paywall"]', '[class*="meter"]', '[class*="subscribe-wall"]'], priority: 3, cooldownMs: 60000 },
    // App banners
    { id: 'generic-app-banner', category: 'app-banner', host: /.*/, label: 'App banner: Dismiss', selectors: ['.smart-app-banner-close', '[class*="app-banner"] [class*="close"]'], textPatterns: ['continue in browser', 'use website', 'no thanks'], priority: 3, cooldownMs: 60000 },
    // Reddit
    { id: 'reddit-open-app', category: 'app-banner', host: /(^|\.)reddit\.com$/, label: 'Reddit: Continue in browser', selectors: ['.XPromoPopupRpl button'], textPatterns: ['continue', 'no thanks', 'not now'], priority: 2, cooldownMs: 30000 },
    // Medium
    { id: 'medium-signin', category: 'popup', host: /(^|\.)medium\.com$/, label: 'Medium: Close sign-in', selectors: ['button[data-testid="close-button"]', 'div[role="dialog"] button[aria-label="close"]'], priority: 2, cooldownMs: 30000 },
    // Quora
    { id: 'quora-signin', category: 'popup', host: /(^|\.)quora\.com$/, label: 'Quora: Close login wall', selectors: ['.qu-borderRadius--circle.modal_close_button', 'button[aria-label="Close"]'], priority: 2, cooldownMs: 30000 },
    // Stack Overflow
    { id: 'so-cookie', category: 'consent', host: /(^|\.)stackoverflow\.com$/, label: 'StackOverflow: Cookies', selectors: ['.js-accept-cookies', '.js-consent-banner button.s-btn__primary'], textPatterns: ['accept all cookies'], priority: 2, cooldownMs: 10000 },
    // LinkedIn
    { id: 'linkedin-cookie', category: 'consent', host: /(^|\.)linkedin\.com$/, label: 'LinkedIn: Cookies', selectors: ['button[action-type="ACCEPT"]', '.artdeco-global-alert-action'], textPatterns: ['accept', 'agree'], priority: 2, cooldownMs: 10000 },
    // News sites
    { id: 'nytimes-gateway', category: 'paywall', host: /(^|\.)nytimes\.com$/, label: 'NYT: Close gateway', selectors: ['button[aria-label="Close"]', '.gateway-close-btn'], priority: 3, cooldownMs: 60000 },
    { id: 'wapo-cookie', category: 'consent', host: /(^|\.)washingtonpost\.com$/, label: 'WaPo: Accept', selectors: ['#wapo_tos_accept'], textPatterns: ['agree'], priority: 2, cooldownMs: 10000 },
    // Unmute overlays
    { id: 'generic-unmute', category: 'unmute', host: /.*/, label: 'Tap to unmute', selectors: ['[class*="unmute"]', 'button[aria-label*="unmute" i]'], textPatterns: ['tap to unmute', 'click to unmute', 'unmute'], priority: 4, cooldownMs: 5000 },
  ];

  const CATEGORY_INFO = {
    'ad-skip': { label: 'Ad Skip', defaultEnabled: true, risk: 'low' },
    'skip-intro': { label: 'Skip Intro / Recap', defaultEnabled: true, risk: 'low' },
    'next-episode': { label: 'Next Episode', defaultEnabled: true, risk: 'low' },
    'continue-watching': { label: 'Continue Watching', defaultEnabled: true, risk: 'low' },
    'autoplay': { label: 'Autoplay Countdown', defaultEnabled: false, risk: 'medium' },
    'consent': { label: 'Cookie Banner', defaultEnabled: true, risk: 'low' },
    'popup': { label: 'Popup / Modal', defaultEnabled: true, risk: 'medium' },
    'newsletter-popup': { label: 'Newsletter Popup', defaultEnabled: true, risk: 'low' },
    'paywall': { label: 'Paywall', defaultEnabled: true, risk: 'medium' },
    'age-gate': { label: 'Age Gate', defaultEnabled: false, risk: 'high' },
    'app-banner': { label: 'App Banner', defaultEnabled: true, risk: 'low' },
    'unmute': { label: 'Unmute Overlay', defaultEnabled: true, risk: 'low' },
  };

  // ============================================================
  // SCOUT
  // ============================================================
  class Scout {
    constructor() {
      this.host = window.location.hostname;
      this.matchedRules = SELECTOR_DB.filter(r => r.host.test(this.host));
      this.observer = null;
      this.scanInterval = null;
      this.onCandidate = () => {};
      this.scanCount = 0;
      this.lastUrl = location.href;
    }
    start(onCandidate) {
      this.onCandidate = onCandidate;
      // Kick off an immediate scan and also queue several follow-up scans for slow-loading SPAs
      this.scan();
      setTimeout(() => this.scan(), 400);
      setTimeout(() => this.scan(), 1200);
      setTimeout(() => this.scan(), 2500);
      this.observer = new MutationObserver(() => this.scheduleScan());
      this.observer.observe(document.body || document.documentElement, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['class', 'style', 'aria-hidden', 'hidden', 'disabled'],
      });
      // Faster interval — 800ms — so ad buttons that appear between DOM mutations get caught quickly
      this.scanInterval = setInterval(() => this.scan(), 800);
      // SPA navigation watchdog — YouTube/Netflix use pushState, not full reloads
      this.urlWatch = setInterval(() => {
        if (location.href !== this.lastUrl) {
          this.lastUrl = location.href;
          this.host = window.location.hostname;
          this.matchedRules = SELECTOR_DB.filter(r => r.host.test(this.host));
          // After SPA nav, re-scan a few times as the new page loads
          setTimeout(() => this.scan(), 300);
          setTimeout(() => this.scan(), 1200);
          setTimeout(() => this.scan(), 2500);
        }
      }, 500);
    }
    stop() {
      if (this.observer) this.observer.disconnect();
      if (this.scanInterval) clearInterval(this.scanInterval);
      if (this.urlWatch) clearInterval(this.urlWatch);
      this.observer = null;
      this.scanInterval = null;
      this.urlWatch = null;
    }
    scheduleScan() {
      if (this._scanQueued) return;
      this._scanQueued = true;
      requestAnimationFrame(() => { this._scanQueued = false; this.scan(); });
    }
    scan() {
      this.scanCount++;
      const candidates = [];
      for (const rule of this.matchedRules) {
        const found = this.findByRule(rule);
        for (const el of found) {
          if (this.isVisible(el) && this.isClickable(el)) {
            candidates.push({
              ruleId: rule.id, category: rule.category, label: rule.label,
              priority: rule.priority, cooldownMs: rule.cooldownMs,
              selectors: rule.selectors,
              element: el, host: this.host, url: window.location.href,
              detectedAt: Date.now(),
            });
          }
        }
      }
      candidates.sort((a, b) => a.priority - b.priority);
      if (candidates.length > 0) this.onCandidate(candidates);
    }
    querySelectorAllDeep(selector) {
      const results = [];
      try {
        const nodes = document.querySelectorAll(selector);
        for (const n of nodes) results.push(n);
      } catch (e) {}
      const walk = (root) => {
        if (!root) return;
        const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = treeWalker.currentNode;
        while (node) {
          if (node.shadowRoot) {
            try {
              const nodes = node.shadowRoot.querySelectorAll(selector);
              for (const n of nodes) results.push(n);
            } catch (e) {}
            walk(node.shadowRoot);
          }
          node = treeWalker.nextNode();
        }
      };
      walk(document.documentElement);
      return results;
    }
    findByRule(rule) {
      const found = [];
      if (rule.selectors && rule.selectors.length > 0) {
        for (const sel of rule.selectors) {
          try {
            const matches = this.querySelectorAllDeep(sel);
            for (const el of matches) {
              if (rule.contextSelectors && !this.matchesContext(el, rule.contextSelectors)) continue;
              if (rule.textPatterns && (sel === 'button' || sel === 'a')) {
                if (!this.matchesText(el, rule.textPatterns)) continue;
              }
              if (!found.includes(el)) found.push(el);
            }
          } catch (e) {}
        }
      }
      return found;
    }
    matchesText(el, patterns) {
      const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (!text || text.length > 80) return false;
      return patterns.some(p => text.includes(p.toLowerCase()));
    }
    matchesContext(el, contextSelectors) {
      let parent = el;
      let depth = 0;
      while (parent && depth < 8) {
        for (const ctx of contextSelectors) {
          try { if (parent.matches && parent.matches(ctx)) return true; } catch (e) {}
        }
        parent = parent.parentElement;
        depth++;
      }
      return false;
    }
    isVisible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
      if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
      return true;
    }
    isClickable(el) {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;
      return true;
    }
  }

  // ============================================================
  // ANALYST
  // ============================================================
  class Analyst {
    constructor(state) {
      this.state = state || { categories: {}, sitePauses: {}, bannedRules: {}, recentClicks: {}, globalPause: false };
      for (const [cat, info] of Object.entries(CATEGORY_INFO)) {
        if (this.state.categories[cat] === undefined) this.state.categories[cat] = info.defaultEnabled;
      }
    }
    evaluate(candidates) {
      const decisions = [];
      if (this.state.globalPause) return candidates.map(c => ({ ...c, action: 'skip', reason: 'Global pause' }));
      const now = Date.now();
      for (const cand of candidates) decisions.push(this.evaluateOne(cand, now));
      const approved = decisions.filter(d => d.action === 'click');
      if (approved.length > 1) {
        for (let i = 1; i < approved.length; i++) {
          approved[i].action = 'defer';
          approved[i].reason = 'Lower priority';
        }
      }
      return decisions;
    }
    evaluateOne(cand, now) {
      const siteHost = this.normalizeHost(cand.host);
      if (this.state.sitePauses[siteHost]) return { ...cand, action: 'skip', reason: 'Site paused' };
      if (this.state.categories[cand.category] === false) return { ...cand, action: 'skip', reason: 'Category disabled' };
      const banUntil = this.state.bannedRules[cand.ruleId];
      if (banUntil && banUntil > now) return { ...cand, action: 'skip', reason: 'Rule banned (you undid)' };
      const lastClick = this.state.recentClicks[cand.ruleId];
      if (lastClick && (now - lastClick) < cand.cooldownMs) return { ...cand, action: 'skip', reason: 'Cooldown' };
      const catInfo = CATEGORY_INFO[cand.category];
      if (catInfo?.risk === 'high' && this.state.categories[cand.category] !== true) return { ...cand, action: 'skip', reason: 'High-risk needs opt-in' };
      return { ...cand, action: 'click', reason: 'OK', categoryInfo: catInfo };
    }
    recordClick(ruleId) { this.state.recentClicks[ruleId] = Date.now(); }
    banRule(ruleId, dur = 86400000) { this.state.bannedRules[ruleId] = Date.now() + dur; }
    pauseSite(host) { this.state.sitePauses[this.normalizeHost(host)] = true; }
    unpauseSite(host) { delete this.state.sitePauses[this.normalizeHost(host)]; }
    normalizeHost(host) { return (host || '').replace(/^www\./, ''); }
  }

  // ============================================================
  // EXECUTOR
  // ============================================================
  class Executor {
    constructor(onAction) {
      this.onAction = onAction || (() => {});
      this.toastEl = null; this.toastTimer = null; this.lastClick = null;
    }
    execute(decision) {
      const el = decision.element;
      if (!el || !el.isConnected) return { ok: false };
      try {
        if (decision.host && decision.host.includes('youtube.com') && decision.category === 'ad-skip') {
          this.pageScriptClick(decision.selectors || []);
        } else {
          this.smartClick(el);
        }
        const action = {
          ruleId: decision.ruleId, category: decision.category, label: decision.label,
          host: decision.host, url: decision.url,
          clickedAt: Date.now(),
          timeSavedSec: this.estimateTimeSaved(decision.category),
        };
        this.lastClick = action;
        this.showToast(decision);
        this.onAction(action);
        return { ok: true, action };
      } catch (e) { return { ok: false }; }
    }
    pageScriptClick(selectors) {
      try {
        const script = document.createElement('script');
        const code = `
          (function() {
            const querySelectorAllDeep = function(selector) {
              const results = [];
              try {
                const nodes = document.querySelectorAll(selector);
                for (const n of nodes) results.push(n);
              } catch (e) {}
              const walk = function(root) {
                if (!root) return;
                const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let node = treeWalker.currentNode;
                while (node) {
                  if (node.shadowRoot) {
                    try {
                      const nodes = node.shadowRoot.querySelectorAll(selector);
                      for (const n of nodes) results.push(n);
                    } catch (e) {}
                    walk(node.shadowRoot);
                  }
                  node = treeWalker.nextNode();
                }
              };
              walk(document.documentElement);
              return results;
            };
            for (const sel of ${JSON.stringify(selectors)}) {
              const matches = querySelectorAllDeep(sel);
              for (const el of matches) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && !el.disabled && el.getAttribute('aria-disabled') !== 'true') {
                  el.click();
                  return;
                }
              }
            }
          })();
        `;
        const blob = new Blob([code], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
          const policy = window.trustedTypes.createPolicy('autopilot', {
            createScriptURL: (url) => url,
          });
          script.src = policy.createScriptURL(blobUrl);
        } else {
          script.src = blobUrl;
        }
        script.onload = () => URL.revokeObjectURL(blobUrl);
        (document.head || document.documentElement).appendChild(script);
      } catch (e) {}
    }
    smartClick(el) {
      // Try full synthetic pointer + mouse event chain FIRST (YouTube/Netflix ad buttons
      // often have pointerdown handlers that native .click() doesn't trigger)
      try {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const common = { view: window, bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
        if (window.PointerEvent) {
          el.dispatchEvent(new PointerEvent('pointerover', { ...common, pointerType: 'mouse' }));
          el.dispatchEvent(new PointerEvent('pointerenter', { ...common, pointerType: 'mouse' }));
          el.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerType: 'mouse' }));
        }
        el.dispatchEvent(new MouseEvent('mouseover', common));
        el.dispatchEvent(new MouseEvent('mousedown', common));
        if (window.PointerEvent) el.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerType: 'mouse' }));
        el.dispatchEvent(new MouseEvent('mouseup', common));
        el.dispatchEvent(new MouseEvent('click', common));
      } catch (e) {}
      // Also call native click() as a belt-and-suspenders (covers cases where
      // synthetic events are blocked by the element's handlers).
      try { if (typeof el.click === 'function') el.click(); } catch (e) {}
    }
    estimateTimeSaved(category) {
      const map = { 'ad-skip': 5, 'skip-intro': 30, 'next-episode': 8, 'continue-watching': 6, 'autoplay': 4, 'consent': 8, 'popup': 6, 'newsletter-popup': 6, 'paywall': 7, 'age-gate': 5, 'app-banner': 5, 'unmute': 4 };
      return map[category] || 5;
    }
    undoLast(analyst) {
      if (!this.lastClick) return false;
      analyst.banRule(this.lastClick.ruleId);
      this.showToast({ label: `Undone: ${this.lastClick.label}`, category: 'undo' }, 4000);
      this.lastClick = null;
      return true;
    }
    showToast(decision, duration = 2500) {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      if (!this.toastEl) {
        this.toastEl = document.createElement('div');
        this.toastEl.id = '__autopilot-toast__';
        this.toastEl.setAttribute('style', `position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;font-size:13px;font-weight:500;padding:12px 16px;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.24);max-width:340px;line-height:1.4;cursor:pointer;transform:translateY(20px);opacity:0;transition:transform 200ms ease-out,opacity 200ms ease-out;`);
        this.toastEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (window.__autopilotInstance) window.__autopilotInstance.undoLast();
        });
        document.documentElement.appendChild(this.toastEl);
      }
      const isUndo = decision.category === 'undo';
      this.toastEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="width:6px;height:6px;border-radius:50%;background:${isUndo ? '#fbbf24' : '#22c55e'};box-shadow:0 0 8px ${isUndo ? '#fbbf24' : '#22c55e'};"></div><div><div style="font-weight:600;">AutoPilot AI</div><div style="opacity:0.8;font-size:12px;margin-top:2px;">${this.escape(decision.label)}</div>${isUndo ? '' : '<div style="opacity:0.5;font-size:11px;margin-top:4px;">Click to undo</div>'}</div></div>`;
      requestAnimationFrame(() => { this.toastEl.style.transform = 'translateY(0)'; this.toastEl.style.opacity = '1'; });
      this.toastTimer = setTimeout(() => { if (this.toastEl) { this.toastEl.style.transform = 'translateY(20px)'; this.toastEl.style.opacity = '0'; } }, duration);
    }
    escape(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  }

  // ============================================================
  // VOICE CONTROLLER
  // ============================================================
  class VoiceController {
    constructor() {
      this.recognition = null; this.listening = false;
      this.commands = [
        { phrases: ['skip', 'skip this', 'skip ad', 'skip intro'], action: 'skip' },
        { phrases: ['pause', 'stop'], action: 'pause' },
        { phrases: ['play', 'resume'], action: 'play' },
        { phrases: ['next', 'next video', 'next episode'], action: 'next' },
        { phrases: ['previous', 'back', 'go back'], action: 'previous' },
        { phrases: ['mute', 'silence'], action: 'mute' },
        { phrases: ['unmute'], action: 'unmute' },
        { phrases: ['louder', 'volume up'], action: 'volumeUp' },
        { phrases: ['quieter', 'volume down'], action: 'volumeDown' },
        { phrases: ['fullscreen', 'full screen'], action: 'fullscreen' },
      ];
    }
    isSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
    // Called directly by a real in-page user gesture (the "Enable voice" pill button).
    // Web Speech API + microphone permission require this to be triggered by a click
    // event that originates inside the page itself — not a chrome.tabs.sendMessage.
    startFromUserGesture() {
      if (this.listening || !this.isSupported()) return false;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          this.processCommand(transcript);
        }
      };
      this.recognition.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'audio-capture') {
          this.listening = false;
          if (window.__autopilotInstance) window.__autopilotInstance.onVoiceError(e.error);
          return;
        }
        if (this.listening) setTimeout(() => { try { this.recognition.start(); } catch (err) {} }, 800);
      };
      this.recognition.onend = () => {
        if (this.listening) setTimeout(() => { try { this.recognition.start(); } catch (err) {} }, 200);
      };
      try {
        this.recognition.start();
        this.listening = true;
        return true;
      } catch (err) {
        this.listening = false;
        return false;
      }
    }
    // Legacy name used by AutoPilot.enableVoice(); now routes to pill button flow
    start() { return this.startFromUserGesture(); }
    stop() {
      this.listening = false;
      if (this.recognition) { try { this.recognition.stop(); } catch (e) {} this.recognition = null; }
    }
    processCommand(transcript) {
      for (const cmd of this.commands) {
        for (const phrase of cmd.phrases) {
          if (transcript.includes(phrase)) { this.handleAction(cmd.action); return; }
        }
      }
    }
    handleAction(action) {
      const video = document.querySelector('video');
      if (!video) return;
      switch (action) {
        case 'skip':
          const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, button[data-uia="player-skip-intro"], .atvwebplayersdk-skipelement-button');
          if (skipBtn) skipBtn.click(); else video.currentTime += 10;
          break;
        case 'pause': video.pause(); break;
        case 'play': video.play(); break;
        case 'next': video.currentTime += 30; break;
        case 'previous': video.currentTime -= 30; break;
        case 'mute': video.muted = true; break;
        case 'unmute': video.muted = false; break;
        case 'volumeUp': video.volume = Math.min(1, video.volume + 0.1); break;
        case 'volumeDown': video.volume = Math.max(0, video.volume - 0.1); break;
        case 'fullscreen':
          if (document.fullscreenElement) document.exitFullscreen();
          else video.requestFullscreen?.();
          break;
      }
    }
  }

  // ============================================================
  // MAIN — wire everything up and start
  // ============================================================
  class AutoPilot {
    constructor() {
      this.scout = new Scout();
      this.analyst = null;
      this.executor = null;
      this.voice = new VoiceController();
      this.started = false;
      this.voiceEnabled = false;
    }
    async init() {
      // Load state from chrome.storage
      const stored = await this.loadState();
      this.analyst = new Analyst(stored.analystState || {});
      this.executor = new Executor((action) => this.handleAction(action));
      this.voiceEnabled = !!stored.voiceEnabled;
      if (this.voiceEnabled) this.showVoicePill();
      this.start();
      // Listen for messages from popup
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((msg, sender, send) => {
          this.handleMessage(msg, send);
          return true;
        });
      }
      // Visible boot log so you can verify the script is live in DevTools
      try {
        console.log('%c[AutoPilot AI] active on ' + this.scout.host + ' — ' + this.scout.matchedRules.length + ' rules armed', 'background:#000;color:#22c55e;padding:2px 6px;border-radius:3px;font-weight:600;');
      } catch (e) {}
    }
    loadState() {
      return new Promise(resolve => {
        if (typeof chrome === 'undefined' || !chrome.storage) return resolve({});
        chrome.storage.local.get(['analystState', 'voiceEnabled'], data => resolve(data || {}));
      });
    }
    saveAnalystState() {
      if (typeof chrome === 'undefined' || !chrome.storage) return;
      chrome.storage.local.set({ analystState: this.analyst.state });
    }
    start() {
      if (this.started) return;
      this.scout.start(candidates => this.handleCandidates(candidates));
      if (/youtube\.com$/.test(this.scout.host)) this.startYouTubeAdSkipper();
      this.started = true;
    }
    stop() {
      this.scout.stop();
      this.voice.stop();
      this.stopYouTubeAdSkipper();
      this.started = false;
    }
    startYouTubeAdSkipper() {
      if (this.ytAdInterval) return;
      this.ytAdInterval = setInterval(() => {
        const player = document.querySelector('#movie_player');
        const isAdShowing = player && player.classList.contains('ad-showing');
        if (!isAdShowing) return;
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
        if (skipBtn) return; // Let the normal click handler deal with skippable ads
        const video = document.querySelector('video');
        if (video && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
          try {
            video.currentTime = video.duration - 0.1;
            this.executor.showToast({ label: 'YouTube: Skipped ad', category: 'ad-skip' });
            this.handleAction({ ruleId: 'yt-skip-ad', category: 'ad-skip', label: 'YouTube: Skipped unskippable ad', host: this.scout.host, url: window.location.href, clickedAt: Date.now(), timeSavedSec: 5 });
          } catch (e) {}
        }
      }, 800);
    }
    stopYouTubeAdSkipper() {
      if (this.ytAdInterval) clearInterval(this.ytAdInterval);
      this.ytAdInterval = null;
    }
    handleCandidates(candidates) {
      const decisions = this.analyst.evaluate(candidates);
      for (const d of decisions) {
        if (d.action === 'click' && d.element) {
          const result = this.executor.execute(d);
          if (result.ok) {
            this.analyst.recordClick(d.ruleId);
            this.saveAnalystState();
          }
          break;
        }
      }
    }
    handleAction(action) {
      // Forward to background to update stats
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'AUTOPILOT_ACTION', action }).catch(() => {});
      }
    }
    undoLast() {
      const ok = this.executor.undoLast(this.analyst);
      if (ok) {
        this.saveAnalystState();
        if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: 'AUTOPILOT_UNDO' }).catch(() => {});
        }
      }
    }
    // Enabling voice needs a real in-page user gesture so the microphone permission
    // prompt can appear and SpeechRecognition.start() is allowed. So we can't just
    // call this.voice.start() from a popup message. Instead we inject a floating
    // pill the user clicks directly; that click is the gesture that unlocks the API.
    enableVoice() {
      this.voiceEnabled = true;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ voiceEnabled: true });
      }
      if (this.voice.listening) return true;
      this.showVoicePill();
      return true;
    }
    disableVoice() {
      this.voiceEnabled = false;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ voiceEnabled: false });
      }
      this.voice.stop();
      this.hideVoicePill();
    }
    showVoicePill() {
      if (this.voicePill) return;
      const pill = document.createElement('div');
      pill.id = '__autopilot-voice-pill__';
      pill.setAttribute('style', `position:fixed;bottom:24px;left:24px;z-index:2147483647;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;font-size:13px;font-weight:600;padding:12px 18px;border-radius:999px;box-shadow:0 8px 32px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.2);`);
      pill.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 10px #fbbf24;"></div><span>Click to enable AutoPilot voice</span>`;
      pill.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        // THIS is a real user gesture inside the page — SpeechRecognition.start() will work
        const ok = this.voice.startFromUserGesture();
        if (ok) {
          pill.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px #22c55e;animation:autopilot-pulse 1.2s infinite;"></div><span>Voice active — say "skip", "pause", "next"</span>`;
          setTimeout(() => this.hideVoicePill(), 4000);
        } else {
          pill.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></div><span>Voice not available in this browser</span>`;
          setTimeout(() => this.hideVoicePill(), 3000);
        }
      });
      // pulse keyframes (one time)
      if (!document.getElementById('__autopilot-styles__')) {
        const style = document.createElement('style');
        style.id = '__autopilot-styles__';
        style.textContent = '@keyframes autopilot-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}';
        document.documentElement.appendChild(style);
      }
      document.documentElement.appendChild(pill);
      this.voicePill = pill;
    }
    hideVoicePill() {
      if (this.voicePill) {
        try { this.voicePill.remove(); } catch (e) {}
        this.voicePill = null;
      }
    }
    onVoiceError(err) {
      if (this.voicePill) {
        this.voicePill.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></div><span>Microphone ${err === 'not-allowed' ? 'permission denied' : 'unavailable'}</span>`;
        setTimeout(() => this.hideVoicePill(), 3000);
      }
    }
    handleMessage(msg, send) {
      switch (msg.type) {
        case 'GET_STATUS':
          send({
            running: this.started,
            host: this.scout.host,
            rulesActive: this.scout.matchedRules.length,
            scanCount: this.scout.scanCount,
            voiceListening: this.voice.listening,
            voiceEnabled: this.voiceEnabled,
            voiceSupported: this.voice.isSupported(),
            analystState: this.analyst?.state,
          });
          break;
        case 'TOGGLE_RUN':
          if (this.started) this.stop(); else this.start();
          send({ running: this.started });
          break;
        case 'PAUSE_SITE':
          this.analyst.pauseSite(this.scout.host);
          this.saveAnalystState();
          send({ ok: true });
          break;
        case 'UNPAUSE_SITE':
          this.analyst.unpauseSite(this.scout.host);
          this.saveAnalystState();
          send({ ok: true });
          break;
        case 'TOGGLE_CATEGORY':
          this.analyst.state.categories[msg.category] = msg.enabled;
          this.saveAnalystState();
          send({ ok: true });
          break;
        case 'ENABLE_VOICE':
          send({ ok: this.enableVoice() });
          break;
        case 'DISABLE_VOICE':
          this.disableVoice();
          send({ ok: true });
          break;
        case 'UNDO_LAST':
          this.undoLast();
          send({ ok: true });
          break;
        default:
          send({ ok: false, error: 'Unknown message type' });
      }
    }
  }

  // Boot
  const autopilot = new AutoPilot();
  window.__autopilotInstance = autopilot;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autopilot.init());
  } else {
    autopilot.init();
  }
})();
