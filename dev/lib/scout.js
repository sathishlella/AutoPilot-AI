// AutoPilot AI — Scout Agent
// Watches the DOM in real-time and finds candidate "annoyance" elements
// Zero LLM. Pure pattern matching against the selector database.

import { SELECTOR_DB } from './selectors.js';

export class Scout {
  constructor() {
    this.host = window.location.hostname;
    this.matchedRules = SELECTOR_DB.filter(r => r.host.test(this.host));
    this.observer = null;
    this.scanInterval = null;
    this.onCandidate = () => {};
    this.scanCount = 0;
    this.scannedAt = null;
  }

  start(onCandidate) {
    this.onCandidate = onCandidate;
    // Initial scan
    this.scan();
    // Reactive: watch for DOM changes (the moment an ad/popup appears)
    this.observer = new MutationObserver(() => {
      this.scheduleScan();
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden', 'hidden'],
    });
    // Safety net: scan every 1.5 seconds for sites that obscure mutations (canvas, shadow DOM)
    this.scanInterval = setInterval(() => this.scan(), 1500);
  }

  stop() {
    if (this.observer) this.observer.disconnect();
    if (this.scanInterval) clearInterval(this.scanInterval);
    this.observer = null;
    this.scanInterval = null;
  }

  scheduleScan() {
    if (this._scanQueued) return;
    this._scanQueued = true;
    requestAnimationFrame(() => {
      this._scanQueued = false;
      this.scan();
    });
  }

  scan() {
    this.scanCount++;
    this.scannedAt = Date.now();
    const candidates = [];
    for (const rule of this.matchedRules) {
      const found = this.findByRule(rule);
      for (const el of found) {
        if (this.isVisible(el) && this.isClickable(el)) {
          candidates.push({
            ruleId: rule.id,
            category: rule.category,
            label: rule.label,
            priority: rule.priority,
            cooldownMs: rule.cooldownMs,
            selectors: rule.selectors,
            element: el,
            host: this.host,
            url: window.location.href,
            detectedAt: Date.now(),
          });
        }
      }
    }
    // Sort by priority (low number = higher priority)
    candidates.sort((a, b) => a.priority - b.priority);
    if (candidates.length > 0) {
      this.onCandidate(candidates);
    }
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
    // 1) Direct CSS selector match (pierces open shadow roots)
    if (rule.selectors && rule.selectors.length > 0) {
      for (const sel of rule.selectors) {
        try {
          const matches = this.querySelectorAllDeep(sel);
          for (const el of matches) {
            // Optional context constraint
            if (rule.contextSelectors && !this.matchesContext(el, rule.contextSelectors)) continue;
            // Optional text constraint when both selectors and textPatterns are defined
            if (rule.textPatterns && rule.selectors.length === 1 && (rule.selectors[0] === 'button' || rule.selectors[0] === 'a')) {
              if (!this.matchesText(el, rule.textPatterns)) continue;
            }
            if (!found.includes(el)) found.push(el);
          }
        } catch (e) {
          // Invalid selector — skip silently
        }
      }
    }
    // 2) Text-pattern match for generic rules (e.g., "any button that says 'accept all'")
    if (rule.textPatterns && (!rule.selectors || rule.selectors.length === 0 || rule.selectors[0] === 'button' || rule.selectors[0] === 'a')) {
      const tags = ['button', 'a', '[role="button"]'];
      for (const tag of tags) {
        try {
          const matches = this.querySelectorAllDeep(tag);
          for (const el of matches) {
            if (this.matchesText(el, rule.textPatterns)) {
              if (rule.contextSelectors && !this.matchesContext(el, rule.contextSelectors)) continue;
              if (!found.includes(el)) found.push(el);
            }
          }
        } catch (e) {
          // skip
        }
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
        try {
          if (parent.matches && parent.matches(ctx)) return true;
        } catch (e) {}
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

  getStats() {
    return {
      host: this.host,
      rulesActive: this.matchedRules.length,
      totalRules: SELECTOR_DB.length,
      scanCount: this.scanCount,
      lastScannedAt: this.scannedAt,
    };
  }
}
