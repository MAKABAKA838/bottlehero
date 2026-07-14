/**
 * Copy Cloudflare Pages static helpers into build/web-desktop after Cocos build.
 * Run from cocos/: node tools/sync-pages-deploy-files.js
 */
const fs = require('fs');
const path = require('path');
const { resolveBuildDirOrExit } = require('./resolve-build-dir');

const root = path.resolve(__dirname, '..');
const buildDir = resolveBuildDirOrExit(root);
const pagesStaticDir = path.join(root, 'pages-static');
const indexPath = path.join(buildDir, 'index.html');
const swSrcPath = path.join(pagesStaticDir, 'sw.js');
const swDstPath = path.join(buildDir, 'sw.js');
const headersSrcPath = path.join(pagesStaticDir, '_headers');
const headersDstPath = path.join(buildDir, '_headers');

const swRegisterSnippet = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
}
</script>`;

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

console.log(`Using build output: ${buildDir}`);

if (!fs.existsSync(headersSrcPath) || !fs.existsSync(swSrcPath)) {
  fail('Missing pages-static/_headers or pages-static/sw.js');
}

const cacheVersion = process.env.BOTTLEHERO_CACHE_VERSION
  || new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

fs.copyFileSync(headersSrcPath, headersDstPath);
console.log(`copied _headers -> ${path.join(buildDir, '_headers')}`);

const swSource = fs.readFileSync(swSrcPath, 'utf8').replace('__BOTTLEHERO_CACHE_VERSION__', cacheVersion);
fs.writeFileSync(swDstPath, swSource, 'utf8');
console.log(`wrote sw.js (cache version ${cacheVersion})`);

if (!fs.existsSync(indexPath)) {
  fail(`Missing ${path.join(buildDir, 'index.html')}`);
}

let indexHtml = fs.readFileSync(indexPath, 'utf8');
if (!indexHtml.includes('navigator.serviceWorker.register')) {
  if (indexHtml.includes('</body>')) {
    indexHtml = indexHtml.replace('</body>', `${swRegisterSnippet}\n</body>`);
  } else {
    indexHtml += swRegisterSnippet;
  }
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log('patched index.html with service worker registration');
} else {
  console.log('index.html already registers service worker');
}

console.log('Pages deploy static files OK.');
