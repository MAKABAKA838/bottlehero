import { jsonResponse } from './feedback.mjs';

export const LEADERBOARD_BOARDS = ['total', 'level_01', 'level_02', 'level_03'];

const BOARD_COLUMNS = {
  total: 'score_total',
  level_01: 'score_level_01',
  level_02: 'score_level_02',
  level_03: 'score_level_03',
};

function normalizeString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(999999999, Math.round(number)));
}

export function getLeaderboardDb(env) {
  return env?.BOTTLEHERO_FEEDBACK_DB || env?.DB || null;
}

export function normalizeLeaderboardBoard(raw) {
  const board = normalizeString(raw, 32) || 'total';
  if (!BOARD_COLUMNS[board]) {
    throw new Error('Invalid board');
  }
  return board;
}

export function normalizeLeaderboardSubmit(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const playerId = normalizeString(payload.playerId, 120);
  const displayName = normalizeString(payload.displayName, 32);
  if (!playerId) {
    throw new Error('playerId is required');
  }
  if (displayName.length < 2 || displayName.length > 16) {
    throw new Error('displayName must be 2-16 chars');
  }
  const levelScores = payload.levelScores && typeof payload.levelScores === 'object'
    ? payload.levelScores
    : {};
  const scoreLevel01 = normalizeScore(levelScores.level_01);
  const scoreLevel02 = normalizeScore(levelScores.level_02);
  const scoreLevel03 = normalizeScore(levelScores.level_03);
  const totalFromLevels = scoreLevel01 + scoreLevel02 + scoreLevel03;
  const totalScore = Math.max(totalFromLevels, normalizeScore(payload.totalScore));
  return {
    playerId,
    displayName,
    avatarId: normalizeString(payload.avatarId, 40) || 'cat02',
    scoreLevel01,
    scoreLevel02,
    scoreLevel03,
    totalScore,
    buildVersion: normalizeString(payload.buildVersion, 80) || 'unknown',
  };
}

export async function ensureLeaderboardSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS leaderboard_players (
      player_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      avatar_id TEXT NOT NULL,
      score_total INTEGER NOT NULL DEFAULT 0,
      score_level_01 INTEGER NOT NULL DEFAULT 0,
      score_level_02 INTEGER NOT NULL DEFAULT 0,
      score_level_03 INTEGER NOT NULL DEFAULT 0,
      build_version TEXT NOT NULL DEFAULT 'unknown',
      updated_at TEXT NOT NULL
    )
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_total
    ON leaderboard_players (score_total DESC, updated_at ASC)
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_level_01
    ON leaderboard_players (score_level_01 DESC, updated_at ASC)
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_level_02
    ON leaderboard_players (score_level_02 DESC, updated_at ASC)
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_level_03
    ON leaderboard_players (score_level_03 DESC, updated_at ASC)
  `).run();
}

export async function upsertLeaderboardPlayer(db, payload) {
  await ensureLeaderboardSchema(db);
  const updatedAt = new Date().toISOString();
  await db.prepare(`
    INSERT INTO leaderboard_players (
      player_id, display_name, avatar_id,
      score_total, score_level_01, score_level_02, score_level_03,
      build_version, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id) DO UPDATE SET
      display_name = excluded.display_name,
      avatar_id = excluded.avatar_id,
      score_level_01 = MAX(leaderboard_players.score_level_01, excluded.score_level_01),
      score_level_02 = MAX(leaderboard_players.score_level_02, excluded.score_level_02),
      score_level_03 = MAX(leaderboard_players.score_level_03, excluded.score_level_03),
      score_total = MAX(leaderboard_players.score_level_01, excluded.score_level_01)
        + MAX(leaderboard_players.score_level_02, excluded.score_level_02)
        + MAX(leaderboard_players.score_level_03, excluded.score_level_03),
      build_version = excluded.build_version,
      updated_at = excluded.updated_at
  `).bind(
    payload.playerId,
    payload.displayName,
    payload.avatarId,
    payload.totalScore,
    payload.scoreLevel01,
    payload.scoreLevel02,
    payload.scoreLevel03,
    payload.buildVersion,
    updatedAt,
  ).run();
  return updatedAt;
}

function mapPlayerRow(row, boardId, rank, isPlayer = false) {
  const column = BOARD_COLUMNS[boardId];
  return {
    rank,
    playerId: row.player_id,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    score: Number(row[column] ?? row.score ?? 0),
    isPlayer,
  };
}

export async function queryLeaderboardBoard(db, { boardId, playerId, limit = 50 }) {
  await ensureLeaderboardSchema(db);
  const column = BOARD_COLUMNS[boardId];
  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
  const topResult = await db.prepare(`
    SELECT player_id, display_name, avatar_id,
      score_total, score_level_01, score_level_02, score_level_03,
      ${column} AS score, updated_at
    FROM leaderboard_players
    WHERE ${column} > 0
    ORDER BY ${column} DESC, updated_at ASC
    LIMIT ?
  `).bind(safeLimit).all();

  const topRows = (topResult.results || []).map((row, index) => mapPlayerRow(row, boardId, index + 1));
  let playerRank = null;
  let playerRow = null;

  if (playerId) {
    const self = await db.prepare(`
      SELECT player_id, display_name, avatar_id,
        score_total, score_level_01, score_level_02, score_level_03,
        ${column} AS score, updated_at
      FROM leaderboard_players
      WHERE player_id = ?
    `).bind(playerId).first();
    if (self && Number(self.score) > 0) {
      const rankResult = await db.prepare(`
        SELECT COUNT(*) AS ahead
        FROM leaderboard_players
        WHERE ${column} > ?
          OR (${column} = ? AND updated_at < ?)
      `).bind(self.score, self.score, self.updated_at).first();
      const rank = Number(rankResult?.ahead || 0) + 1;
      playerRank = rank;
      playerRow = mapPlayerRow(self, boardId, rank, true);
      const inTop = topRows.some((row) => row.playerId === playerId);
      if (!inTop) {
        const trimmed = topRows.slice(0, Math.max(0, safeLimit - 1));
        return {
          boardId,
          rows: [...trimmed, playerRow],
          playerRank,
          source: 'online',
        };
      }
      return {
        boardId,
        rows: topRows.map((row) => (row.playerId === playerId ? { ...row, isPlayer: true } : row)),
        playerRank,
        source: 'online',
      };
    }
  }

  return {
    boardId,
    rows: topRows,
    playerRank,
    source: 'online',
  };
}

export { jsonResponse };
