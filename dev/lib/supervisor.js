// AutoPilot AI — Supervisor Agent
// Tracks every action, computes "time saved" stats, learns from undo events
// Persists to chrome.storage.local for the popup dashboard

const STORAGE_KEY = 'autopilot_state_v1';

export class Supervisor {
  constructor() {
    this.stats = {
      totalClicks: 0,
      totalSecondsSaved: 0,
      byCategory: {},
      bySite: {},
      recentActions: [], // last 50
      installedAt: null,
      undoCount: 0,
    };
    this.listeners = [];
  }

  async load() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        if (!this.stats.installedAt) this.stats.installedAt = Date.now();
        return resolve(this.stats);
      }
      chrome.storage.local.get([STORAGE_KEY], (data) => {
        if (data && data[STORAGE_KEY]) {
          this.stats = { ...this.stats, ...data[STORAGE_KEY] };
        }
        if (!this.stats.installedAt) this.stats.installedAt = Date.now();
        resolve(this.stats);
      });
    });
  }

  async save() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
      chrome.storage.local.set({ [STORAGE_KEY]: this.stats }, resolve);
    });
  }

  recordAction(action) {
    this.stats.totalClicks++;
    this.stats.totalSecondsSaved += action.timeSavedSec || 0;
    // By category
    if (!this.stats.byCategory[action.category]) {
      this.stats.byCategory[action.category] = { count: 0, secondsSaved: 0 };
    }
    this.stats.byCategory[action.category].count++;
    this.stats.byCategory[action.category].secondsSaved += action.timeSavedSec || 0;
    // By site
    const host = (action.host || '').replace(/^www\./, '');
    if (!this.stats.bySite[host]) {
      this.stats.bySite[host] = { count: 0, secondsSaved: 0 };
    }
    this.stats.bySite[host].count++;
    this.stats.bySite[host].secondsSaved += action.timeSavedSec || 0;
    // Recent (cap at 50)
    this.stats.recentActions.unshift({
      label: action.label,
      category: action.category,
      host,
      clickedAt: action.clickedAt,
      timeSavedSec: action.timeSavedSec,
      ruleId: action.ruleId,
    });
    if (this.stats.recentActions.length > 50) {
      this.stats.recentActions.length = 50;
    }
    this.save();
    this.notifyListeners();
  }

  recordUndo() {
    this.stats.undoCount++;
    this.save();
    this.notifyListeners();
  }

  getStats() {
    return JSON.parse(JSON.stringify(this.stats));
  }

  getDerivedStats() {
    const s = this.stats;
    const seconds = s.totalSecondsSaved;
    return {
      totalClicks: s.totalClicks,
      totalSecondsSaved: seconds,
      humanReadableTime: this.humanizeSeconds(seconds),
      avgPerDay: this.computeDailyAverage(),
      topCategory: this.topCategory(),
      topSite: this.topSite(),
      installedDays: this.daysSinceInstall(),
      undoCount: s.undoCount,
      undoRate: s.totalClicks > 0 ? Math.round((s.undoCount / s.totalClicks) * 100) : 0,
    };
  }

  humanizeSeconds(s) {
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
    return `${(s / 86400).toFixed(1)}d`;
  }

  computeDailyAverage() {
    const days = Math.max(1, this.daysSinceInstall());
    return Math.round(this.stats.totalSecondsSaved / days);
  }

  daysSinceInstall() {
    const installedAt = this.stats.installedAt || Date.now();
    return Math.max(1, Math.floor((Date.now() - installedAt) / 86400000));
  }

  topCategory() {
    let best = null;
    let max = 0;
    for (const [k, v] of Object.entries(this.stats.byCategory)) {
      if (v.count > max) {
        max = v.count;
        best = k;
      }
    }
    return best;
  }

  topSite() {
    let best = null;
    let max = 0;
    for (const [k, v] of Object.entries(this.stats.bySite)) {
      if (v.count > max) {
        max = v.count;
        best = k;
      }
    }
    return best;
  }

  reset() {
    this.stats = {
      totalClicks: 0,
      totalSecondsSaved: 0,
      byCategory: {},
      bySite: {},
      recentActions: [],
      installedAt: Date.now(),
      undoCount: 0,
    };
    this.save();
    this.notifyListeners();
  }

  onUpdate(fn) {
    this.listeners.push(fn);
  }

  notifyListeners() {
    for (const fn of this.listeners) fn(this.getDerivedStats());
  }
}
