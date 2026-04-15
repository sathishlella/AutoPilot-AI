// AutoPilot AI — Analyst Agent
// Decides whether each candidate should actually be auto-clicked
// Considers: user prefs, cooldowns, undo history, site pause state
// Zero LLM. Pure rule-based decision logic.

import { CATEGORY_INFO } from './selectors.js';

export class Analyst {
  constructor(state) {
    // state shape:
    // {
    //   categories: { 'ad-skip': true, ... },
    //   sitePauses: { 'youtube.com': false, ... },
    //   bannedRules: { 'rule-id': timestamp },
    //   recentClicks: { 'rule-id': timestamp },
    //   globalPause: false
    // }
    this.state = state || {
      categories: {},
      sitePauses: {},
      bannedRules: {},
      recentClicks: {},
      globalPause: false,
    };
    // Initialize default category prefs
    for (const [cat, info] of Object.entries(CATEGORY_INFO)) {
      if (this.state.categories[cat] === undefined) {
        this.state.categories[cat] = info.defaultEnabled;
      }
    }
  }

  evaluate(candidates) {
    const decisions = [];
    if (this.state.globalPause) {
      return candidates.map(c => ({ ...c, action: 'skip', reason: 'Global pause active' }));
    }
    const now = Date.now();
    for (const cand of candidates) {
      const decision = this.evaluateOne(cand, now);
      decisions.push(decision);
    }
    // Only return one approved per scan to avoid race conditions (the highest-priority one)
    const approved = decisions.filter(d => d.action === 'click');
    if (approved.length > 1) {
      const best = approved[0]; // already priority-sorted by Scout
      for (const d of approved.slice(1)) {
        d.action = 'defer';
        d.reason = 'Lower priority than another approved candidate';
      }
    }
    return decisions;
  }

  evaluateOne(cand, now) {
    const base = { ...cand };
    delete base.element; // strip DOM ref for logging clarity later

    // 1) Site paused?
    const siteHost = this.normalizeHost(cand.host);
    if (this.state.sitePauses[siteHost]) {
      return { ...cand, action: 'skip', reason: `Paused on ${siteHost}` };
    }

    // 2) Category disabled?
    const catEnabled = this.state.categories[cand.category];
    if (catEnabled === false) {
      return { ...cand, action: 'skip', reason: `Category "${cand.category}" disabled` };
    }

    // 3) Rule banned (user previously undid this)?
    const banUntil = this.state.bannedRules[cand.ruleId];
    if (banUntil && banUntil > now) {
      return { ...cand, action: 'skip', reason: 'Rule temporarily banned (you undid this)' };
    }

    // 4) Cooldown active?
    const lastClick = this.state.recentClicks[cand.ruleId];
    if (lastClick && (now - lastClick) < cand.cooldownMs) {
      return { ...cand, action: 'skip', reason: 'Cooldown active' };
    }

    // 5) High-risk category needs user explicit opt-in
    const catInfo = CATEGORY_INFO[cand.category];
    if (catInfo?.risk === 'high' && catEnabled !== true) {
      return { ...cand, action: 'skip', reason: 'High-risk category requires explicit opt-in' };
    }

    // ✓ Approved
    return {
      ...cand,
      action: 'click',
      reason: 'All checks passed',
      categoryInfo: catInfo,
    };
  }

  recordClick(ruleId) {
    this.state.recentClicks[ruleId] = Date.now();
  }

  banRule(ruleId, durationMs = 24 * 60 * 60 * 1000) {
    // Default ban: 24 hours
    this.state.bannedRules[ruleId] = Date.now() + durationMs;
  }

  unbanRule(ruleId) {
    delete this.state.bannedRules[ruleId];
  }

  pauseSite(host) {
    this.state.sitePauses[this.normalizeHost(host)] = true;
  }

  unpauseSite(host) {
    delete this.state.sitePauses[this.normalizeHost(host)];
  }

  toggleCategory(category, enabled) {
    this.state.categories[category] = enabled;
  }

  setGlobalPause(paused) {
    this.state.globalPause = paused;
  }

  normalizeHost(host) {
    return host.replace(/^www\./, '');
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
