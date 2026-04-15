// AutoPilot AI — Popup Script

const CATEGORY_INFO = {
  'ad-skip': { label: 'Ad Skip', defaultEnabled: true },
  'skip-intro': { label: 'Skip Intro / Recap', defaultEnabled: true },
  'next-episode': { label: 'Next Episode', defaultEnabled: true },
  'continue-watching': { label: 'Continue Watching', defaultEnabled: true },
  'consent': { label: 'Cookie Banners', defaultEnabled: true },
  'popup': { label: 'Popups / Modals', defaultEnabled: true },
  'newsletter-popup': { label: 'Newsletter Popups', defaultEnabled: true },
  'paywall': { label: 'Paywalls', defaultEnabled: true },
  'app-banner': { label: 'App Banners', defaultEnabled: true },
  'unmute': { label: 'Unmute Overlays', defaultEnabled: true },
  'autoplay': { label: 'Autoplay Countdown', defaultEnabled: false },
  'age-gate': { label: 'Age Gate', defaultEnabled: false },
};

let activeTab = null;
let contentStatus = null;

async function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  });
}

function sendToTab(tabId, msg) {
  return new Promise(resolve => {
    try {
      chrome.tabs.sendMessage(tabId, msg, response => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(response);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

function sendToBackground(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, response => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(response);
    });
  });
}

function humanizeSeconds(s) {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

function renderCategories(state) {
  const list = document.getElementById('categoryList');
  list.innerHTML = '';
  for (const [key, info] of Object.entries(CATEGORY_INFO)) {
    const enabled = state?.categories?.[key] ?? info.defaultEnabled;
    const row = document.createElement('div');
    row.className = 'toggle-row';
    row.innerHTML = `
      <span class="row-label">${info.label}</span>
      <div class="toggle ${enabled ? 'on' : ''}" data-cat="${key}"></div>
    `;
    list.appendChild(row);
  }
  list.querySelectorAll('.toggle').forEach(el => {
    el.addEventListener('click', async () => {
      const cat = el.dataset.cat;
      const newState = !el.classList.contains('on');
      el.classList.toggle('on', newState);
      if (activeTab) {
        await sendToTab(activeTab.id, { type: 'TOGGLE_CATEGORY', category: cat, enabled: newState });
      }
    });
  });
}

function renderRecent(stats) {
  const list = document.getElementById('recentList');
  if (!stats?.recentActions || stats.recentActions.length === 0) {
    list.innerHTML = '<div class="empty">Nothing yet</div>';
    return;
  }
  list.innerHTML = '';
  for (const action of stats.recentActions.slice(0, 6)) {
    const ago = Math.floor((Date.now() - action.clickedAt) / 1000);
    const agoStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago/60)}m ago` : `${Math.floor(ago/3600)}h ago`;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="row-label">${escapeHtml(action.label)}</span><span class="row-value">${agoStr}</span>`;
    list.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function refresh() {
  activeTab = await getActiveTab();
  // Pull stats from background
  const stats = await sendToBackground({ type: 'GET_DERIVED_STATS' });
  // Pull live status from content script (may be null on chrome:// pages)
  contentStatus = activeTab ? await sendToTab(activeTab.id, { type: 'GET_STATUS' }) : null;

  // Hero
  document.getElementById('totalTime').textContent = humanizeSeconds(stats?.totalSecondsSaved || 0);
  if (stats && stats.totalClicks > 0) {
    const days = stats.installedDays || 1;
    document.getElementById('totalSub').textContent = `${stats.totalClicks} clicks · ${humanizeSeconds(stats.avgPerDay)}/day avg`;
  }
  document.getElementById('totalClicks').textContent = stats?.totalClicks || 0;

  // This site
  if (contentStatus) {
    const host = (contentStatus.host || '').replace(/^www\./, '');
    const siteStats = stats?.bySite?.[host];
    document.getElementById('thisSite').textContent = siteStats ? siteStats.count : 0;
    document.getElementById('statusDot').className = contentStatus.running ? 'status-dot' : 'status-dot off';
    // Voice toggle
    document.getElementById('voiceToggle').classList.toggle('on', contentStatus.voiceListening || contentStatus.voiceEnabled);
  } else {
    document.getElementById('thisSite').textContent = 'reload page';
    document.getElementById('statusDot').className = 'status-dot off';
  }

  // Categories
  renderCategories(contentStatus?.analystState);
  // Recent
  renderRecent(stats);
}

document.addEventListener('DOMContentLoaded', () => {
  refresh();

  document.getElementById('voiceToggle').addEventListener('click', async () => {
    if (!activeTab) return;
    const isOn = document.getElementById('voiceToggle').classList.contains('on');
    if (isOn) {
      await sendToTab(activeTab.id, { type: 'DISABLE_VOICE' });
    } else {
      await sendToTab(activeTab.id, { type: 'ENABLE_VOICE' });
    }
    setTimeout(refresh, 200);
  });

  document.getElementById('undoBtn').addEventListener('click', async () => {
    if (!activeTab) return;
    await sendToTab(activeTab.id, { type: 'UNDO_LAST' });
    setTimeout(refresh, 300);
  });

  document.getElementById('pauseSiteBtn').addEventListener('click', async () => {
    if (!activeTab) return;
    await sendToTab(activeTab.id, { type: 'PAUSE_SITE' });
    setTimeout(refresh, 200);
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset all AutoPilot stats?')) return;
    await sendToBackground({ type: 'RESET_STATS' });
    setTimeout(refresh, 200);
  });

  document.getElementById('dashBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });
});
