/**
 * Phase 4 one-shot acceptance runner.
 * Run from cocos/: node tools/verify-bottlehero-phase4.js
 */
const path = require('path');
const { spawnSync } = require('child_process');

const checks = [
  'verify-bottlehero-code-structure.js',
  'verify-bottlehero-host-wiring.js',
  'verify-bottlehero-config.js',
  'verify-bottlehero-assets.js',
  'verify-bottlehero-boss-animations.js',
  'verify-bottlehero-feedback-survey.js',
];

let failed = false;

for (const script of checks) {
  const fullPath = path.join(__dirname, script);
  console.log(`\n=== RUN ${script} ===`);
  const result = spawnSync(process.execPath, [fullPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
    console.error(`FAIL ${script} exit=${result.status}`);
  } else {
    console.log(`PASS ${script}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('\nPhase 4 acceptance checks all passed.');
