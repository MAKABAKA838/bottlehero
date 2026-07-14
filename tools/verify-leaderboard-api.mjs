import assert from 'node:assert/strict';
import { createLeaderboardLocalStore } from './leaderboard-local-store.mjs';
import {
  normalizeLeaderboardBoard,
  normalizeLeaderboardSubmit,
} from '../functions/_shared/leaderboard.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-leaderboard-'));
const storePath = path.join(tempDir, 'leaderboard.json');
const store = createLeaderboardLocalStore(storePath);

store.upsertFromPayload({
  playerId: 'bh_test_a',
  displayName: 'PlayerA',
  avatarId: 'cat02',
  levelScores: { level_01: 1000, level_02: 2000, level_03: 3000 },
  totalScore: 6000,
});

store.upsertFromPayload({
  playerId: 'bh_test_b',
  displayName: 'PlayerB',
  avatarId: 'cat02',
  levelScores: { level_01: 5000, level_02: 0, level_03: 0 },
  totalScore: 5000,
});

const totalBoard = store.queryFromUrl(new URL('http://localhost/api/leaderboard?board=total&playerId=bh_test_a&limit=6'));
assert.equal(totalBoard.ok, true);
assert.equal(totalBoard.rows[0].playerId, 'bh_test_a');
assert.equal(totalBoard.rows[0].score, 6000);
const selfRow = totalBoard.rows.find((row) => row.isPlayer);
assert.ok(selfRow);
assert.equal(selfRow.playerId, 'bh_test_a');

const levelBoard = store.queryFromUrl(new URL('http://localhost/api/leaderboard?board=level_01&playerId=bh_test_b&limit=6'));
assert.equal(levelBoard.rows[0].playerId, 'bh_test_b');
assert.equal(levelBoard.rows[0].score, 5000);

assert.throws(() => normalizeLeaderboardBoard('invalid'));
assert.throws(() => normalizeLeaderboardSubmit({ playerId: 'x', displayName: 'a' }));

console.log('verify-leaderboard-api OK');
