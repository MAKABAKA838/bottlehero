export const SURVEY_VERSION = '2026-06-12-level01-demo';

export const optionSets = {
  funRating: [
    ['very_fun', '非常好玩'],
    ['fun', '比较好玩'],
    ['average', '一般'],
    ['boring', '有点无聊'],
    ['very_boring', '很无聊'],
  ],
  replayIntent: [
    ['yes', '愿意'],
    ['maybe', '可能会'],
    ['no', '不太愿意'],
  ],
  favoriteParts: [
    ['timing', '轨迹判定'],
    ['tower', '道具塔成长'],
    ['boss', '最终怪物战'],
    ['avatar', '宠物装扮'],
    ['art', '画面风格'],
    ['score', '分数挑战'],
    ['none', '没有特别喜欢'],
  ],
  painPoints: [
    ['too_hard', '太难'],
    ['too_easy', '太简单'],
    ['unclear', '不知道怎么玩'],
    ['loading', '加载太慢'],
    ['controls', '操作不舒服'],
    ['boss_bad', '最终怪物战不好玩'],
    ['art_bad', '画面不喜欢'],
    ['weak_goal', '目标感不强'],
    ['boring', '整体无聊'],
  ],
  gender: [
    ['male', '男'],
    ['female', '女'],
    ['prefer_not', '不方便说'],
  ],
  userSegment: [
    ['primary', '小学生'],
    ['middle', '初中生'],
    ['high', '高中生'],
    ['college', '大学生'],
    ['worker', '上班族'],
    ['parent_other', '家长或其他'],
  ],
  gameFrequency: [
    ['rare', '几乎不玩'],
    ['sometimes', '偶尔玩'],
    ['weekly', '每周会玩'],
    ['daily', '经常玩'],
  ],
  artStyle: [
    ['style_01', '当前卡通风'],
    ['style_02', '像素夜晚风'],
    ['style_03', '柔和手绘风'],
    ['style_04', '方块像素风'],
    ['style_05', '温暖绘本风'],
  ],
};

const optionMaps = Object.fromEntries(
  Object.entries(optionSets).map(([key, options]) => [key, new Map(options)]),
);

export function getOptionLabel(group, id) {
  return optionMaps[group]?.get(id) || id;
}

function requireOption(group, value, label = group) {
  if (typeof value !== 'string' || !optionMaps[group]?.has(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function normalizeMultiSelect(group, value, max, label = group) {
  const raw = Array.isArray(value) ? value : [];
  const unique = [...new Set(raw.filter((item) => typeof item === 'string'))];
  if (unique.length > max) {
    throw new Error(`${label}最多选择${max}个`);
  }
  for (const item of unique) {
    requireOption(group, item, label);
  }
  return unique;
}

function normalizeString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(min, Math.min(max, number));
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function normalizeFeedbackPayload(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const normalized = {
    surveyVersion: SURVEY_VERSION,
    buildVersion: normalizeString(payload.buildVersion, 80) || 'unknown',
    sessionId: normalizeString(payload.sessionId, 120) || 'anonymous',
    playerId: normalizeString(payload.playerId, 120),
    bestScore: Math.round(normalizeNumber(payload.bestScore, 0, 999999999)),
    playDurationSeconds: Math.round(normalizeNumber(payload.playDurationSeconds, 0, 86400)),
    reachedBoss: normalizeBoolean(payload.reachedBoss),
    bossWin: normalizeBoolean(payload.bossWin),
    funRating: requireOption('funRating', payload.funRating),
    replayIntent: requireOption('replayIntent', payload.replayIntent),
    favoriteParts: normalizeMultiSelect('favoriteParts', payload.favoriteParts, 2, 'favoriteParts'),
    painPoints: normalizeMultiSelect('painPoints', payload.painPoints, 2, 'painPoints'),
    gender: requireOption('gender', payload.gender),
    userSegment: requireOption('userSegment', payload.userSegment),
    gameFrequency: requireOption('gameFrequency', payload.gameFrequency),
    artFavoriteId: requireOption('artStyle', payload.artFavoriteId, 'artFavoriteId'),
    artDislikeId: payload.artDislikeId ? requireOption('artStyle', payload.artDislikeId, 'artDislikeId') : '',
    comment: normalizeString(payload.comment, 240),
    userAgent: normalizeString(payload.userAgent, 240),
  };

  if (normalized.artDislikeId && normalized.artDislikeId === normalized.artFavoriteId) {
    throw new Error('artDislikeId不能和artFavoriteId相同');
  }

  return normalized;
}

function countBy(rows, field, group) {
  const counts = new Map();
  for (const row of rows) {
    const value = row[field];
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: getOptionLabel(group, id), count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function countArrayValues(rows, field, group) {
  const counts = new Map();
  for (const row of rows) {
    const values = Array.isArray(row[field]) ? row[field] : [];
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: getOptionLabel(group, id), count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function percentage(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function buildFeedbackSummary(rows) {
  const normalizedRows = rows.map((row) => ({
    ...row,
    favoriteParts: Array.isArray(row.favoriteParts) ? row.favoriteParts : parseJsonArray(row.favoriteParts),
    painPoints: Array.isArray(row.painPoints) ? row.painPoints : parseJsonArray(row.painPoints),
    reachedBoss: normalizeBoolean(row.reachedBoss),
    bossWin: normalizeBoolean(row.bossWin),
  }));
  const total = normalizedRows.length;
  const funPositive = normalizedRows.filter((row) => row.funRating === 'very_fun' || row.funRating === 'fun').length;
  const replayPositive = normalizedRows.filter((row) => row.replayIntent === 'yes' || row.replayIntent === 'maybe').length;
  const boring = normalizedRows.filter((row) => row.funRating === 'boring' || row.funRating === 'very_boring').length;
  const reachedBoss = normalizedRows.filter((row) => row.reachedBoss).length;
  const bossWins = normalizedRows.filter((row) => row.bossWin).length;

  return {
    total,
    funPositiveRate: percentage(funPositive, total),
    replayPositiveRate: percentage(replayPositive, total),
    boringRate: percentage(boring, total),
    bossReachRate: percentage(reachedBoss, total),
    bossWinRate: percentage(bossWins, total),
    funRatings: countBy(normalizedRows, 'funRating', 'funRating'),
    replayIntent: countBy(normalizedRows, 'replayIntent', 'replayIntent'),
    userSegments: countBy(normalizedRows, 'userSegment', 'userSegment'),
    gender: countBy(normalizedRows, 'gender', 'gender'),
    gameFrequency: countBy(normalizedRows, 'gameFrequency', 'gameFrequency'),
    artFavorites: countBy(normalizedRows, 'artFavoriteId', 'artStyle'),
    artDislikes: countBy(normalizedRows, 'artDislikeId', 'artStyle'),
    favoriteParts: countArrayValues(normalizedRows, 'favoriteParts', 'favoriteParts'),
    painPoints: countArrayValues(normalizedRows, 'painPoints', 'painPoints'),
    recent: normalizedRows.slice(0, 30),
  };
}

export function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function getFeedbackDb(env) {
  return env?.BOTTLEHERO_FEEDBACK_DB || env?.DB || null;
}

export async function ensureFeedbackSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback_responses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      survey_version TEXT NOT NULL,
      build_version TEXT NOT NULL,
      session_id TEXT NOT NULL,
      player_id TEXT,
      best_score INTEGER NOT NULL DEFAULT 0,
      play_duration_seconds INTEGER NOT NULL DEFAULT 0,
      reached_boss INTEGER NOT NULL DEFAULT 0,
      boss_win INTEGER NOT NULL DEFAULT 0,
      fun_rating TEXT NOT NULL,
      replay_intent TEXT NOT NULL,
      favorite_parts TEXT NOT NULL,
      pain_points TEXT NOT NULL,
      gender TEXT NOT NULL,
      user_segment TEXT NOT NULL,
      game_frequency TEXT NOT NULL,
      art_favorite_id TEXT NOT NULL,
      art_dislike_id TEXT,
      comment TEXT,
      user_agent TEXT
    )
  `).run();
}

export function dbRowToFeedback(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    surveyVersion: row.survey_version,
    buildVersion: row.build_version,
    sessionId: row.session_id,
    playerId: row.player_id || '',
    bestScore: Number(row.best_score || 0),
    playDurationSeconds: Number(row.play_duration_seconds || 0),
    reachedBoss: Boolean(row.reached_boss),
    bossWin: Boolean(row.boss_win),
    funRating: row.fun_rating,
    replayIntent: row.replay_intent,
    favoriteParts: parseJsonArray(row.favorite_parts),
    painPoints: parseJsonArray(row.pain_points),
    gender: row.gender,
    userSegment: row.user_segment,
    gameFrequency: row.game_frequency,
    artFavoriteId: row.art_favorite_id,
    artDislikeId: row.art_dislike_id || '',
    comment: row.comment || '',
    userAgent: row.user_agent || '',
  };
}
