const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveBuildDirOrExit } = require('./resolve-build-dir');

const root = resolveBuildDirOrExit(path.resolve(__dirname, '..'));
console.log(`Serving build output: ${root}`);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const localFeedbackLog = path.join(root, 'feedback-local-submissions.jsonl');
const localLeaderboardStorePath = path.join(root, 'leaderboard-local-store.json');
let leaderboardStorePromise;

async function getLeaderboardStore() {
  if (!leaderboardStorePromise) {
    const { createLeaderboardLocalStore } = await import('./leaderboard-local-store.mjs');
    leaderboardStorePromise = createLeaderboardLocalStore(localLeaderboardStorePath);
  }
  return leaderboardStorePromise;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.bin': 'application/octet-stream',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

/** 与 Cloudflare `_headers` 对齐：静态资源长缓存，HTML/API 不长期缓存。 */
function getStaticCacheControl(urlPath, filePath) {
  if (urlPath.startsWith('/api/')) {
    return 'no-store';
  }
  const base = path.basename(filePath);
  if (base === 'index.html' || base === 'sw.js' || base === 'settings.json') {
    return 'no-cache';
  }
  const ext = path.extname(filePath).toLowerCase();
  if (urlPath.startsWith('/assets/') || urlPath.startsWith('/src/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (['.js', '.wasm', '.css', '.png', '.jpg', '.jpeg', '.mp3', '.m4a', '.ico', '.bin'].includes(ext)) {
    return 'public, max-age=31536000, immutable';
  }
  if (ext === '.json') {
    return 'public, max-age=86400';
  }
  return 'public, max-age=3600';
}

function handleFeedbackApi(req, res) {
  readJsonBody(req)
    .then((payload) => {
      fs.appendFileSync(
        localFeedbackLog,
        `${JSON.stringify({ at: new Date().toISOString(), ...payload })}\n`,
      );
      sendJson(res, 200, { ok: true, id: `local-${Date.now()}` });
    })
    .catch((error) => {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid JSON body.',
      });
    });
}

async function handleLeaderboardApi(req, res, url) {
  const store = await getLeaderboardStore();
  try {
    if (req.method === 'GET') {
      sendJson(res, 200, store.queryFromUrl(url));
      return;
    }
    if (req.method === 'POST') {
      const payload = await readJsonBody(req);
      sendJson(res, 200, store.upsertFromPayload(payload));
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid leaderboard request.',
    });
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    handleFeedbackApi(req, res);
    return;
  }

  if (url.pathname === '/api/leaderboard' && (req.method === 'GET' || req.method === 'POST')) {
    void handleLeaderboardApi(req, res, url);
    return;
  }

  let file = decodeURIComponent(url.pathname);
  if (file === '/') {
    file = '/index.html';
  }

  const fullPath = path.normalize(path.join(root, file));
  if (!fullPath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(fullPath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(fullPath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': getStaticCacheControl(file, fullPath),
    });
    fs.createReadStream(fullPath).pipe(res);
  });
}).listen(port, host, () => {
  console.log(`Bottlehero mobile server: http://${host}:${port}`);
  console.log('Local feedback API: POST /api/feedback -> feedback-local-submissions.jsonl');
  console.log('Local leaderboard API: GET/POST /api/leaderboard -> leaderboard-local-store.json');
});
