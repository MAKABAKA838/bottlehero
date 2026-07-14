/**
 * Verify feedback survey static pages exist in player build output.
 *
 * Usage (from cocos/):
 *   node tools/verify-bottlehero-feedback-survey.js
 */
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '../build/web-desktop');
const feedbackAssetsSrc = path.join(__dirname, '../assets/resources/bottlehero/feedback-assets');

const requiredFiles = [
  'feedback.html',
  'feedback.js',
  'feedback.css',
  'feedback-client.mjs',
];

const requiredArtStyles = [
  'feedback-assets/artstyle_1.jpg',
  'feedback-assets/artstyle_2.jpg',
  'feedback-assets/artstyle_3.jpg',
  'feedback-assets/artstyle_4.jpg',
  'feedback-assets/artstyle_5.jpg',
];

if (!fs.existsSync(buildDir)) {
  console.error(`FAIL build output not found: ${buildDir}`);
  process.exit(1);
}

const errors = [];

for (const file of requiredFiles) {
  const filePath = path.join(buildDir, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`missing ${file}`);
  }
}

for (const file of requiredArtStyles) {
  const filePath = path.join(buildDir, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`missing ${file}`);
  }
}

if (!fs.existsSync(feedbackAssetsSrc)) {
  errors.push('missing source feedback-assets directory in Cocos resources');
}

console.log('Bottlehero feedback survey verification');
console.log('build:', buildDir);

if (errors.length) {
  console.error('\nFAIL (' + errors.length + '):');
  for (const error of errors) {
    console.error('  -', error);
  }
  console.error('\nFix: rebuild Web Desktop, then run: node tools/sync-web-runtime-assets.js');
  process.exit(1);
}

console.log('PASS: feedback survey pages and art assets present in build/web-desktop');
