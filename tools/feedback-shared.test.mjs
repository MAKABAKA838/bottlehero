import assert from 'node:assert/strict';
import {
  buildFeedbackSummary,
  getOptionLabel,
  normalizeFeedbackPayload,
} from '../functions/_shared/feedback.mjs';

const basePayload = {
  buildVersion: 'local-test',
  sessionId: 'session-a',
  bestScore: 56000,
  playDurationSeconds: 245,
  reachedBoss: true,
  bossWin: false,
  funRating: 'very_fun',
  replayIntent: 'yes',
  favoriteParts: ['timing', 'boss'],
  painPoints: ['loading'],
  gender: 'male',
  userSegment: 'worker',
  gameFrequency: 'weekly',
  artFavoriteId: 'style_01',
  artDislikeId: 'style_04',
  comment: 'More bosses please',
};

const normalized = normalizeFeedbackPayload(basePayload);
assert.equal(normalized.funRating, 'very_fun');
assert.deepEqual(normalized.favoriteParts, ['timing', 'boss']);
assert.equal(normalized.comment, 'More bosses please');
assert.equal(getOptionLabel('favoriteParts', 'timing'), '轨迹判定');
assert.equal(getOptionLabel('favoriteParts', 'avatar'), '宠物装扮');
assert.equal(getOptionLabel('favoriteParts', 'boss'), '最终怪物战');
assert.equal(getOptionLabel('painPoints', 'boss_bad'), '最终怪物战不好玩');

assert.throws(
  () => normalizeFeedbackPayload({ ...basePayload, funRating: 'bad-value' }),
  /Invalid funRating/,
);

assert.throws(
  () => normalizeFeedbackPayload({ ...basePayload, favoriteParts: ['timing', 'boss', 'avatar'] }),
  /favoriteParts最多选择2个/,
);

assert.throws(
  () => normalizeFeedbackPayload({ ...basePayload, artFavoriteId: '' }),
  /artFavoriteId/,
);

const summary = buildFeedbackSummary([
  normalized,
  normalizeFeedbackPayload({
    ...basePayload,
    sessionId: 'session-b',
    funRating: 'boring',
    replayIntent: 'no',
    favoriteParts: ['avatar'],
    painPoints: ['boring', 'too_hard'],
    gender: 'female',
    userSegment: 'college',
    gameFrequency: 'rare',
    artFavoriteId: 'style_03',
    artDislikeId: 'style_01',
    bossWin: true,
  }),
  normalizeFeedbackPayload({
    ...basePayload,
    sessionId: 'session-c',
    funRating: 'fun',
    replayIntent: 'maybe',
    favoriteParts: ['timing'],
    painPoints: [],
    gender: 'prefer_not',
    userSegment: 'primary',
    gameFrequency: 'daily',
    artFavoriteId: 'style_01',
    artDislikeId: 'style_02',
  }),
]);

assert.equal(summary.total, 3);
assert.equal(summary.funPositiveRate, 67);
assert.equal(summary.replayPositiveRate, 67);
assert.equal(summary.boringRate, 33);
assert.equal(summary.bossWinRate, 33);
assert.deepEqual(summary.artFavorites.slice(0, 2), [
  { id: 'style_01', label: '当前卡通风', count: 2 },
  { id: 'style_03', label: '柔和手绘风', count: 1 },
]);
assert.equal(summary.painPoints.find((item) => item.id === 'loading')?.count, 1);

console.log('feedback shared tests passed');
