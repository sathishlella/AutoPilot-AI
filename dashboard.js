// AutoPilot AI — Dashboard

const CATEGORY_LABELS = {
  'ad-skip': 'Ad Skip', 'skip-intro': 'Skip Intro', 'next-episode': 'Next Episode',
  'continue-watching': 'Continue Watching', 'autoplay': 'Autoplay', 'consent': 'Cookie Banner',
  'popup': 'Popup', 'newsletter-popup': 'Newsletter', 'paywall': 'Paywall',
  'age-gate': 'Age Gate', 'app-banner': 'App Banner', 'unmute': 'Unmute',
};

function humanizeSeconds(s) {
  if (!s) return '0s';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadStats() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_DERIVED_STATS' }, response => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(response);
    });
  });
}

function renderHero(stats) {
  document.getElementById('totalTime').textContent = humanizeSeconds(stats.totalSecondsSaved);
  document.getElementById('totalClicks').textContent = stats.totalClicks || 0;
  document.getElementById('avgPerDay').textContent = humanizeSeconds(stats.avgPerDay);
  document.getElementById('undoRate').textContent = (stats.undoRate || 0) + '%';
  document.getElementById('installedDays').textContent = `over ${stats.installedDays || 1} day${stats.installedDays === 1 ? '' : 's'}`;
  if (stats.totalClicks > 0) {
    document.getElementById('totalSub').textContent = `${stats.totalClicks} clicks across ${Object.keys(stats.bySite || {}).length} sites`;
  }
}

function renderRanked(containerId, data, totalKey, labelMap) {
  const c = document.getElementById(containerId);
  const entries = Object.entries(data || {}).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  if (entries.length === 0) {
    c.innerHTML = '<div class="empty">No data yet</div>';
    return;
  }
  const max = Math.max(...entries.map(e => e[1].count));
  c.innerHTML = '';
  for (const [key, val] of entries) {
    const label = labelMap?.[key] || key;
    const pct = max > 0 ? (val.count / max) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <span class="row-label" style="min-width:140px;">${escapeHtml(label)}</span>
      <div class="row-bar"><div class="row-bar-fill" style="width:${pct}%;"></div></div>
      <span class="row-value" style="min-width:80px;text-align:right;">${val.count} · ${humanizeSeconds(val.secondsSaved)}</span>
    `;
    c.appendChild(row);
  }
}

function renderRecent(stats) {
  const c = document.getElementById('recentRows');
  if (!stats.recentActions || stats.recentActions.length === 0) {
    c.innerHTML = '<div class="empty">No actions yet — install AutoPilot and visit any site to see it work</div>';
    return;
  }
  c.innerHTML = '';
  for (const a of stats.recentActions.slice(0, 15)) {
    const ago = Math.floor((Date.now() - a.clickedAt) / 1000);
    const agoStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago/60)}m ago` : ago < 86400 ? `${Math.floor(ago/3600)}h ago` : `${Math.floor(ago/86400)}d ago`;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="row-label">${escapeHtml(a.label)}</span><span class="row-value">${escapeHtml(a.host)} · ${agoStr}</span>`;
    c.appendChild(row);
  }
}

async function refresh() {
  const stats = await loadStats();
  if (!stats) return;
  renderHero(stats);
  renderRanked('categoryRows', stats.byCategory, 'count', CATEGORY_LABELS);
  renderRanked('siteRows', stats.bySite, 'count');
  renderRecent(stats);
}

document.addEventListener('DOMContentLoaded', refresh);
setInterval(refresh, 5000);
