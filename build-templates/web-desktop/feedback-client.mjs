const requiredFields = [
  { key: 'funRating', label: '第 1 题：好玩程度' },
  { key: 'replayIntent', label: '第 2 题：是否愿意再玩' },
  { key: 'gender', label: '第 5 题：性别' },
  { key: 'userSegment', label: '第 5 题：用户类型' },
  { key: 'gameFrequency', label: '第 6 题：小游戏频率' },
  { key: 'artFavoriteId', label: '第 7 题：美术风格' },
];

export function validateFeedbackSelection(selection) {
  const missing = requiredFields
    .filter((field) => !selection[field.key])
    .map((field) => field.key);
  if (missing.length) {
    const labels = requiredFields
      .filter((field) => missing.includes(field.key))
      .map((field) => field.label);
    return {
      ok: false,
      missingFields: missing,
      message: `还有未填写项：${labels.join('、')}`,
    };
  }

  if ((selection.favoriteParts || []).length > 2 || (selection.painPoints || []).length > 2) {
    return {
      ok: false,
      missingFields: [],
      message: '喜欢点和问题点都最多选择 2 个',
    };
  }

  return { ok: true, missingFields: [], message: '' };
}

export function buildFeedbackPayload({
  selection,
  buildVersion,
  sessionId,
  playerId,
  bestScore,
  playDurationSeconds,
  reachedBoss,
  bossWin,
}) {
  return {
    buildVersion,
    sessionId,
    playerId,
    bestScore,
    playDurationSeconds,
    reachedBoss,
    bossWin,
    funRating: selection.funRating,
    replayIntent: selection.replayIntent,
    favoriteParts: selection.favoriteParts || [],
    painPoints: selection.painPoints || [],
    gender: selection.gender,
    userSegment: selection.userSegment,
    gameFrequency: selection.gameFrequency,
    artFavoriteId: selection.artFavoriteId,
    artDislikeId: '',
    comment: String(selection.comment || '').trim(),
  };
}
