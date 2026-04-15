// AutoPilot AI — Background Service Worker (Supervisor)
// Receives action events from content scripts, persists time-saved stats,
// serves dashboard data to the popup.

const STORAGE_KEY = 'autopilot_stats_v1';

const DEFAULT_STATS = {
  totalClicks: 0,
  totalSecondsSaved: 0,
  byCategory: {},
  bySite: {},
  recentActions: [],
  installedAt: null,
  undoCount: 0,
};

async function getStats() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], data => {
      const stats = (data && data[STORAGE_KEY]) || { ...DEFAULT_STATS };
      if (!stats.installedAt) stats.installedAt = Date.now();
      resolve(stats);
    });
  });
}

async function saveStats(stats) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: stats }, resolve);
  });
}

async function recordAction(action) {
  const stats = await getStats();
  stats.totalClicks++;
  stats.totalSecondsSaved += action.timeSavedSec || 0;

  if (!stats.byCategory[action.category]) {
    stats.byCategory[action.category] = { count: 0, secondsSaved: 0 };
  }
  stats.byCategory[action.category].count++;
  stats.byCategory[action.category].secondsSaved += action.timeSavedSec || 0;

  const host = (action.host || '').replace(/^www\./, '');
  if (!stats.bySite[host]) {
    stats.bySite[host] = { count: 0, secondsSaved: 0 };
  }
  stats.bySite[host].count++;
  stats.bySite[host].secondsSaved += action.timeSavedSec || 0;

  stats.recentActions.unshift({
    label: action.label,
    category: action.category,
    host,
    clickedAt: action.clickedAt,
    timeSavedSec: action.timeSavedSec,
    ruleId: action.ruleId,
  });
  if (stats.recentActions.length > 50) stats.recentActions.length = 50;

  await saveStats(stats);
  // Update badge with click count
  chrome.action.setBadgeText({ text: String(stats.totalClicks) });
  chrome.action.setBadgeBackgroundColor({ color: '#000000' });
}

async function recordUndo() {
  const stats = await getStats();
  stats.undoCount++;
  await saveStats(stats);
}

function humanizeSeconds(s) {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

async function getDerivedStats() {
  const s = await getStats();
  const days = Math.max(1, Math.floor((Date.now() - (s.installedAt || Date.now())) / 86400000));
  let topCat = null, maxC = 0;
  for (const [k, v] of Object.entries(s.byCategory)) {
    if (v.count > maxC) { maxC = v.count; topCat = k; }
  }
  let topSite = null, maxS = 0;
  for (const [k, v] of Object.entries(s.bySite)) {
    if (v.count > maxS) { maxS = v.count; topSite = k; }
  }
  return {
    totalClicks: s.totalClicks,
    totalSecondsSaved: s.totalSecondsSaved,
    humanReadableTime: humanizeSeconds(s.totalSecondsSaved),
    avgPerDay: Math.round(s.totalSecondsSaved / days),
    avgPerDayHuman: humanizeSeconds(s.totalSecondsSaved / days),
    topCategory: topCat,
    topSite,
    installedDays: days,
    undoCount: s.undoCount,
    undoRate: s.totalClicks > 0 ? Math.round((s.undoCount / s.totalClicks) * 100) : 0,
    recentActions: s.recentActions,
    byCategory: s.byCategory,
    bySite: s.bySite,
  };
}

async function resetStats() {
  await saveStats({ ...DEFAULT_STATS, installedAt: Date.now() });
  chrome.action.setBadgeText({ text: '' });
}

// Offscreen document for voice (MV3)
let creatingOffscreen = false;
async function setupOffscreenDocument() {
  if (creatingOffscreen) return;
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  if (existing && existing.length > 0) return;
  creatingOffscreen = true;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Speech recognition for voice commands'
  });
  creatingOffscreen = false;
}
async function closeOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  if (existing && existing.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// Message router
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'AUTOPILOT_ACTION':
          await recordAction(msg.action);
          sendResponse({ ok: true });
          break;
        case 'AUTOPILOT_UNDO':
          await recordUndo();
          sendResponse({ ok: true });
          break;
        case 'GET_DERIVED_STATS':
          sendResponse(await getDerivedStats());
          break;
        case 'RESET_STATS':
          await resetStats();
          sendResponse({ ok: true });
          break;
        case 'START_VOICE':
          await setupOffscreenDocument();
          chrome.runtime.sendMessage({ type: 'START_VOICE_OFFSCREEN' });
          sendResponse({ ok: true });
          break;
        case 'STOP_VOICE':
          chrome.runtime.sendMessage({ type: 'STOP_VOICE_OFFSCREEN' });
          setTimeout(closeOffscreenDocument, 500);
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ ok: false, error: 'Unknown' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true; // async response
});

// Forward voice results from offscreen to the active tab content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'VOICE_RESULT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'VOICE_RESULT', transcript: msg.transcript }).catch(() => {});
      }
    });
    return false;
  }
  if (msg.type === 'VOICE_ERROR') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'VOICE_ERROR', error: msg.error }).catch(() => {});
      }
    });
    return false;
  }
});

// On install
chrome.runtime.onInstalled.addListener(async () => {
  const stats = await getStats();
  if (!stats.installedAt) {
    stats.installedAt = Date.now();
    await saveStats(stats);
  }
  chrome.action.setBadgeText({ text: stats.totalClicks > 0 ? String(stats.totalClicks) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#000000' });
});
