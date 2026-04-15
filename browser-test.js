const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  let script = fs.readFileSync('content.js', 'utf-8');
  // Spoof hostname so YouTube rules match on local file
  script = script.replace('window.location.hostname', "'www.youtube.com'");
  script = script.replace('location.href', "'https://www.youtube.com/watch?v=test'");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  await page.goto('file:///' + path.resolve('test-page.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  
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
  
  await page.waitForTimeout(1500);
  
  const status = await page.evaluate(() => {
    const inst = window.__autopilotInstance;
    return {
      hasAutopilot: !!inst,
      host: inst?.scout?.host,
      rulesActive: inst?.scout?.matchedRules?.length,
      scanCount: inst?.scout?.scanCount,
      started: inst?.started,
      ytAdInterval: !!inst?.ytAdInterval,
      bootError: window.__autopilotError || null
    };
  });
  
  console.log('Boot status:', JSON.stringify(status, null, 2));
  console.log('Console logs:', logs.filter(l => l.includes('AutoPilot')));
  
  // Simulate ad
  await page.evaluate(() => {
    const player = document.querySelector('#movie_player');
    if (player) player.classList.add('ad-showing');
    const video = document.querySelector('video');
    if (video) {
      Object.defineProperty(video, 'duration', { value: 15, configurable: true });
      video.currentTime = 0;
    }
  });
  
  await page.waitForTimeout(1500);
  
  const afterAd = await page.evaluate(() => {
    const video = document.querySelector('video');
    return {
      hasAdShowingClass: document.querySelector('#movie_player')?.classList?.contains('ad-showing'),
      videoCurrentTime: video?.currentTime,
      videoPlaybackRate: video?.playbackRate,
      lastAdSkipAt: window.__autopilotInstance?._lastAdSkipAt,
    };
  });
  
  console.log('After simulated ad:', JSON.stringify(afterAd, null, 2));
  console.log('All logs:', logs);
  
  // Test page-script click bridge
  await page.evaluate(() => {
    const btn = document.createElement('button');
    btn.className = 'ytp-skip-ad-button';
    btn.innerText = 'Skip';
    btn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999';
    document.body.appendChild(btn);
    window.__testSkipClicked = false;
    btn.addEventListener('click', () => { window.__testSkipClicked = true; });
  });
  
  await page.evaluate(() => {
    window.__autopilotInstance.executor.pageScriptClick([]);
  });
  
  await page.waitForTimeout(500);
  
  const clickResult = await page.evaluate(() => ({
    testSkipClicked: window.__testSkipClicked,
    lastClick: window.__autopilotLastClick || null
  }));
  
  console.log('Page-script click test:', JSON.stringify(clickResult, null, 2));
  
  await page.screenshot({ path: 'browser-test-result.png', fullPage: true });
  await browser.close();
})();
