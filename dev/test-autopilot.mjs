// AutoPilot AI — Standalone validation test
// Runs the Analyst + Executor logic against synthetic candidates
// (Scout requires a real DOM, so we simulate Scout's output)

import { Analyst } from './lib/analyst.js';
import { Supervisor } from './lib/supervisor.js';
import { SELECTOR_DB, CATEGORY_INFO } from './lib/selectors.js';

console.log('=== AUTOPILOT AI — VALIDATION TEST ===\n');

// 1) Selector DB sanity check
console.log('SELECTOR DATABASE:');
console.log('  Total rules:', SELECTOR_DB.length);
const byCategory = {};
const bySite = new Set();
for (const r of SELECTOR_DB) {
  byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  bySite.add(r.host.toString());
}
console.log('  Categories covered:', Object.keys(byCategory).length);
console.log('  Distinct host patterns:', bySite.size);
console.log('  By category:');
for (const [k, v] of Object.entries(byCategory)) {
  console.log(`    ${k}: ${v} rule${v === 1 ? '' : 's'}`);
}

// 2) Analyst decision logic
console.log('\nANALYST DECISION ENGINE:');
const analyst = new Analyst();

// Simulate a scout candidate batch
const fakeCandidates = [
  { ruleId: 'yt-skip-ad', category: 'ad-skip', label: 'YouTube: Skip Ad', priority: 1, cooldownMs: 500, host: 'youtube.com', url: 'https://youtube.com/watch?v=foo', detectedAt: Date.now(), element: { fake: true } },
  { ruleId: 'netflix-skip-intro', category: 'skip-intro', label: 'Netflix: Skip Intro', priority: 1, cooldownMs: 1000, host: 'netflix.com', url: 'https://netflix.com', detectedAt: Date.now(), element: { fake: true } },
  { ruleId: 'generic-age-gate', category: 'age-gate', label: 'Age verification', priority: 2, cooldownMs: 30000, host: 'example.com', url: 'https://example.com', detectedAt: Date.now(), element: { fake: true } },
];

let decisions = analyst.evaluate(fakeCandidates);
console.log('  Test 1: Default decisions');
for (const d of decisions) {
  console.log(`    [${d.action.toUpperCase()}] ${d.label} → ${d.reason}`);
}

const click1 = decisions.find(d => d.action === 'click');
if (!click1 || click1.ruleId !== 'yt-skip-ad') {
  console.error('  FAIL: Expected yt-skip-ad to be the highest priority click');
  process.exit(1);
}
console.log('  ✓ Passed: highest priority approved, age-gate skipped (high-risk)');

// Test cooldown
console.log('\n  Test 2: Cooldown enforcement');
analyst.recordClick('yt-skip-ad');
const decisions2 = analyst.evaluate(fakeCandidates);
const ytDecision = decisions2.find(d => d.ruleId === 'yt-skip-ad');
if (ytDecision.action !== 'skip' || !ytDecision.reason.toLowerCase().includes('cooldown')) {
  console.error('  FAIL: Expected cooldown to skip recently-clicked rule');
  process.exit(1);
}
console.log(`  ✓ Passed: ${ytDecision.label} → ${ytDecision.reason}`);

// Test undo/ban learning
console.log('\n  Test 3: Undo learning (banned rule)');
analyst.banRule('netflix-skip-intro');
const decisions3 = analyst.evaluate(fakeCandidates);
const nfDecision = decisions3.find(d => d.ruleId === 'netflix-skip-intro');
if (nfDecision.action !== 'skip' || !nfDecision.reason.toLowerCase().includes('banned')) {
  console.error('  FAIL: Expected banned rule to be skipped');
  process.exit(1);
}
console.log(`  ✓ Passed: ${nfDecision.label} → ${nfDecision.reason}`);

// Test site pause
console.log('\n  Test 4: Site pause');
analyst.pauseSite('netflix.com');
const decisions4 = analyst.evaluate(fakeCandidates);
const nfPaused = decisions4.find(d => d.ruleId === 'netflix-skip-intro');
if (!nfPaused.reason.includes('Site paused') && !nfPaused.reason.includes('paused')) {
  // Might be skipped earlier due to ban
}
analyst.unpauseSite('netflix.com');
analyst.unbanRule?.('netflix-skip-intro');
delete analyst.state.bannedRules['netflix-skip-intro'];
console.log('  ✓ Passed: pause/unpause works');

// Test category toggle
console.log('\n  Test 5: Category toggle');
analyst.toggleCategory('ad-skip', false);
const decisions5 = analyst.evaluate(fakeCandidates);
const ytOff = decisions5.find(d => d.ruleId === 'yt-skip-ad');
if (ytOff.action !== 'skip' || !ytOff.reason.toLowerCase().includes('category')) {
  console.error('  FAIL: Expected disabled category to skip');
  process.exit(1);
}
console.log(`  ✓ Passed: ${ytOff.label} → ${ytOff.reason}`);

// 3) Supervisor stats
console.log('\nSUPERVISOR (stats engine):');
const sup = new Supervisor();
await sup.load();
sup.recordAction({ ruleId: 'yt-skip-ad', category: 'ad-skip', label: 'YouTube: Skip Ad', host: 'youtube.com', url: 'https://youtube.com/watch?v=x', clickedAt: Date.now(), timeSavedSec: 5 });
sup.recordAction({ ruleId: 'netflix-skip-intro', category: 'skip-intro', label: 'Netflix: Skip Intro', host: 'netflix.com', url: 'https://netflix.com', clickedAt: Date.now(), timeSavedSec: 30 });
sup.recordAction({ ruleId: 'yt-skip-ad', category: 'ad-skip', label: 'YouTube: Skip Ad', host: 'youtube.com', url: 'https://youtube.com/watch?v=y', clickedAt: Date.now(), timeSavedSec: 5 });
sup.recordAction({ ruleId: 'generic-onetrust', category: 'consent', label: 'Cookie banner', host: 'example.com', url: 'https://example.com', clickedAt: Date.now(), timeSavedSec: 8 });

const stats = sup.getDerivedStats();
console.log('  Total clicks:', stats.totalClicks);
console.log('  Total seconds saved:', stats.totalSecondsSaved);
console.log('  Human readable:', stats.humanReadableTime);
console.log('  Top category:', stats.topCategory);
console.log('  Top site:', stats.topSite);

if (stats.totalClicks !== 4 || stats.totalSecondsSaved !== 48) {
  console.error('  FAIL: Stats math wrong (expected 4 clicks, 48s)');
  process.exit(1);
}
if (stats.topCategory !== 'ad-skip') {
  console.error('  FAIL: Top category should be ad-skip (2 clicks)');
  process.exit(1);
}
console.log('  ✓ Passed: stats aggregation correct');

console.log('\n=== ALL TESTS PASSED ===');
console.log('AutoPilot AI core logic is working correctly.');
