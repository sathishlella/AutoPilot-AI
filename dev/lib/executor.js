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
    if (!el || !el.isConnected) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const common = {
      view: window, bubbles: true, cancelable: true, composed: true,
      clientX: cx, clientY: cy, screenX: cx, screenY: cy,
      button: 0, buttons: 1, isPrimary: true, pointerId: 1, pointerType: 'mouse'
    };

    // Strategy 1: native click (fast path)
    try { if (typeof el.click === 'function') el.click(); } catch (e) {}

    // Strategy 2: focus + Enter key (many buttons respond to keyboard activation)
    try {
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
    } catch (e) {}

    // Strategy 3: full synthetic pointer + mouse chain
    try {
      if (window.PointerEvent) {
        el.dispatchEvent(new PointerEvent('pointerover', common));
        el.dispatchEvent(new PointerEvent('pointerenter', common));
        el.dispatchEvent(new PointerEvent('pointerdown', common));
      }
      el.dispatchEvent(new MouseEvent('mouseover', common));
      el.dispatchEvent(new MouseEvent('mouseenter', common));
      el.dispatchEvent(new MouseEvent('mousedown', common));
      if (window.PointerEvent) el.dispatchEvent(new PointerEvent('pointerup', common));
      el.dispatchEvent(new MouseEvent('mouseup', common));
      el.dispatchEvent(new MouseEvent('click', common));
    } catch (e) {}

    // Strategy 4: click via elementFromPoint to hit the actual topmost rendered element
    try {
      const target = document.elementFromPoint(cx, cy);
      if (target && target !== el && !el.contains(target) && !target.contains(el)) {
        target.dispatchEvent(new MouseEvent('mousedown', common));
        target.dispatchEvent(new MouseEvent('mouseup', common));
        target.dispatchEvent(new MouseEvent('click', common));
        try { if (typeof target.click === 'function') target.click(); } catch (e) {}
      }
    } catch (e) {}

    // Strategy 5: try clicking the first interactive child (YouTube skip button handler is sometimes on a child span/svg)
    try {
      const child = el.querySelector('button, [role="button"], svg, span');
      if (child && child !== el) {
        child.dispatchEvent(new MouseEvent('mousedown', common));
        child.dispatchEvent(new MouseEvent('mouseup', common));
        child.dispatchEvent(new MouseEvent('click', common));
        try { if (typeof child.click === 'function') child.click(); } catch (e) {}
      }
    } catch (e) {}
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
