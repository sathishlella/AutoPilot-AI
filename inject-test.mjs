import { readFileSync } from 'fs';
export default async (page) => {
  const script = readFileSync('content.js', 'utf-8');
  await page.evaluate((code) => {
    window.chrome = window.chrome || {};
    window.chrome.storage = { local: { get: (keys, cb) => cb && cb({}), set: () => {} } };
    window.chrome.runtime = { 
      onMessage: { addListener: () => {} }, 
      sendMessage: () => ({ catch: () => {} }),
      lastError: null
    };
    new Function(code)();
  }, script);
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const inst = window.__autopilotInstance;
    return {
      hasAutopilot: !!inst,
      host: inst?.scout?.host,
      rulesActive: inst?.scout?.matchedRules?.length,
      scanCount: inst?.scout?.scanCount,
      started: inst?.started,
      voiceSupported: inst?.voice?.isSupported?.(),
      voiceListening: inst?.voice?.listening,
      voiceEnabled: inst?.voiceEnabled,
      ytAdInterval: !!inst?.ytAdInterval,
      candidateLabels: inst?.scout && Array.isArray(inst.scout.matchedRules) ? inst.scout.matchedRules.map(r => r.label) : []
    };
  });
  await page.screenshot({ path: 'youtube-autopilot-test.png', fullPage: false });
  return info;
};
