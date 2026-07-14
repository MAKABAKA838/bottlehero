import assert from 'node:assert/strict';
import {
  buildFeedbackPayload,
  validateFeedbackSelection,
} from '../build-templates/web-desktop/feedback-client.mjs';

const incomplete = validateFeedbackSelection({
  funRating: 'fun',
  replayIntent: '',
  gender: 'prefer_not',
  userSegment: 'worker',
  gameFrequency: 'weekly',
  artFavoriteId: '',
  favoriteParts: ['timing'],
  painPoints: [],
});

assert.equal(incomplete.ok, false);
assert.deepEqual(incomplete.missingFields, ['replayIntent', 'artFavoriteId']);
assert.equal(incomplete.message.includes('第 2 题'), true);
assert.equal(incomplete.message.includes('第 7 题'), true);

const tooMany = validateFeedbackSelection({
  funRating: 'fun',
  replayIntent: 'yes',
  gender: 'prefer_not',
  userSegment: 'worker',
  gameFrequency: 'weekly',
  artFavoriteId: 'style_01',
  favoriteParts: ['timing', 'boss', 'avatar'],
  painPoints: [],
});

assert.equal(tooMany.ok, false);
assert.equal(tooMany.message.includes('最多选择 2 个'), true);

const complete = validateFeedbackSelection({
  funRating: 'very_fun',
  replayIntent: 'yes',
  gender: 'female',
  userSegment: 'college',
  gameFrequency: 'daily',
  artFavoriteId: 'style_03',
  favoriteParts: ['boss', 'avatar'],
  painPoints: ['loading'],
});

assert.equal(complete.ok, true);

const payload = buildFeedbackPayload({
  selection: {
    funRating: 'very_fun',
    replayIntent: 'yes',
    gender: 'female',
    userSegment: 'college',
    gameFrequency: 'daily',
    artFavoriteId: 'style_03',
    favoriteParts: ['boss', 'avatar'],
    painPoints: ['loading'],
    comment: 'nice',
  },
  buildVersion: 'client-test',
  sessionId: 'session-1',
  playerId: 'player-1',
  bestScore: 1000,
  playDurationSeconds: 88,
  reachedBoss: true,
  bossWin: false,
});

assert.equal(payload.funRating, 'very_fun');
assert.equal(payload.comment, 'nice');
assert.deepEqual(payload.favoriteParts, ['boss', 'avatar']);

console.log('feedback client tests passed');
