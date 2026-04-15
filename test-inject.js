async (page) => {
  const fs = require('fs');
  const script = fs.readFileSync('content.js', 'utf-8');
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
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const inst = window.__autopilotInstance;
    return {
      hasAutopilot: !!inst,
      host: inst?.scout?.host,
      rulesActive: inst?.scout?.matchedRules?.length,
      scanCount: inst?.scout?.scanCount,
      started: inst?.started,
      ytAdInterval: !!inst?.ytAdInterval,
    };
  });
  return info;
}
