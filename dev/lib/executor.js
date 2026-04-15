// AutoPilot AI — Executor Agent
// Performs the click safely and shows a tiny visual confirmation toast
// Provides a 5-second undo window after every click

export class Executor {
  constructor(onAction) {
    this.onAction = onAction || (() => {});
    this.toastEl = null;
    this.toastTimer = null;
    this.lastClick = null;
  }

  execute(decision) {
    const el = decision.element;
    if (!el || !el.isConnected) {
      return { ok: false, reason: 'Element no longer in DOM' };
    }
    try {
      this.smartClick(el);
      const action = {
        ruleId: decision.ruleId,
        category: decision.category,
        label: decision.label,
        host: decision.host,
        url: decision.url,
        clickedAt: Date.now(),
        timeSavedSec: this.estimateTimeSaved(decision.category),
      };
      this.lastClick = { ...action, ruleId: decision.ruleId };
      this.showToast(decision);
      this.onAction(action);
      return { ok: true, action };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  smartClick(el) {
    // Strategy 1: native click
    if (typeof el.click === 'function') {
      el.click();
      return;
    }
    // Strategy 2: dispatch synthetic mouse event
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const events = ['mousedown', 'mouseup', 'click'];
    for (const type of events) {
      el.dispatchEvent(new MouseEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: cx,
        clientY: cy,
      }));
    }
  }

  estimateTimeSaved(category) {
    // Conservative seconds saved per click (the time you'd waste navigating + clicking manually)
    const map = {
      'ad-skip': 5,           // 5 seconds you'd wait until the skip button appears + travel to mouse
      'skip-intro': 30,       // intro + travel time
      'next-episode': 8,      // wait for autoplay countdown
      'continue-watching': 6, // dialog + click
      'autoplay': 4,
      'consent': 8,           // find banner + scan + click
      'popup': 6,
      'newsletter-popup': 6,
      'paywall': 7,
      'age-gate': 5,
      'app-banner': 5,
      'unmute': 4,
    };
    return map[category] || 5;
  }

  undoLast(analyst) {
    if (!this.lastClick) return false;
    // Ban the rule for 24h so it doesn't keep firing
    analyst.banRule(this.lastClick.ruleId);
    this.showToast({ label: `Undone: ${this.lastClick.label} (banned 24h)`, category: 'undo' }, 4000);
    this.lastClick = null;
    return true;
  }

  showToast(decision, duration = 2500) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (!this.toastEl) {
      this.toastEl = document.createElement('div');
      this.toastEl.id = '__autopilot-toast__';
      this.toastEl.setAttribute('style', `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: #000;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.24);
        max-width: 340px;
        line-height: 1.4;
        pointer-events: auto;
        cursor: pointer;
        transform: translateY(20px);
        opacity: 0;
        transition: transform 200ms ease-out, opacity 200ms ease-out;
      `);
      this.toastEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // Click the toast = quick undo
        if (window.__autopilotInstance) {
          window.__autopilotInstance.undoLast();
        }
      });
      document.documentElement.appendChild(this.toastEl);
    }
    const isUndo = decision.category === 'undo';
    this.toastEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${isUndo ? '#fbbf24' : '#22c55e'};box-shadow:0 0 8px ${isUndo ? '#fbbf24' : '#22c55e'};"></div>
        <div>
          <div style="font-weight:600;">AutoPilot AI</div>
          <div style="opacity:0.8;font-size:12px;margin-top:2px;">${this.escape(decision.label)}</div>
          ${isUndo ? '' : '<div style="opacity:0.5;font-size:11px;margin-top:4px;">Click to undo</div>'}
        </div>
      </div>
    `;
    requestAnimationFrame(() => {
      this.toastEl.style.transform = 'translateY(0)';
      this.toastEl.style.opacity = '1';
    });
    this.toastTimer = setTimeout(() => {
      if (this.toastEl) {
        this.toastEl.style.transform = 'translateY(20px)';
        this.toastEl.style.opacity = '0';
      }
    }, duration);
  }

  escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
}
