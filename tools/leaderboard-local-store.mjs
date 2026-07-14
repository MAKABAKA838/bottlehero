import fs from 'fs';
import path from 'path';
import {
  normalizeLeaderboardBoard,
  normalizeLeaderboardSubmit,
} from '../functions/_shared/leaderboard.mjs';

export function createLeaderboardLocalStore(filePath) {
  const resolved = path.resolve(filePath);

  function readState() {
    if (!fs.existsSync(resolved)) {
      return { players: {} };
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      return parsed && typeof parsed === 'object' && parsed.players ? parsed : { players: {} };
    } catch {
      return { players: {} };
    }
  }

  function writeState(state) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, `${JSON.stringify(state, null, 2)}\n`);
  }

  function upsertPlayer(payload) {
    const state = readState();
    const existing = state.players[payload.playerId] || {
      player_id: payload.playerId,
      display_name: payload.displayName,
      avatar_id: payload.avatarId,
      score_level_01: 0,
      score_level_02: 0,
      score_level_03: 0,
      score_total: 0,
      build_version: payload.buildVersion,
      updated_at: new Date(0).toISOString(),
    };
    const next = {
      ...existing,
      display_name: payload.displayName,
      avatar_id: payload.avatarId,
      score_level_01: Math.max(existing.score_level_01, payload.scoreLevel01),
      score_level_02: Math.max(existing.score_level_02, payload.scoreLevel02),
      score_level_03: Math.max(existing.score_level_03, payload.scoreLevel03),
      build_version: payload.buildVersion,
      updated_at: new Date().toISOString(),
    };
    next.score_total = next.score_level_01 + next.score_level_02 + next.score_level_03;
    state.players[payload.playerId] = next;
    writeState(state);
    return next.updated_at;
  }

  function queryBoard({ boardId, playerId, limit = 6 }) {
    const column = boardId === 'total' ? 'score_total' : `score_${boardId}`;
    const state = readState();
    const rows = Object.values(state.players)
      .filter((row) => Number(row[column]) > 0)
      .sort((a, b) => {
        const scoreDiff = Number(b[column]) - Number(a[column]);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return String(a.updated_at).localeCompare(String(b.updated_at));
      });
    const topRows = rows.slice(0, limit).map((row, index) => ({
      rank: index + 1,
      playerId: row.player_id,
      displayName: row.display_name,
      avatarId: row.avatar_id,
      score: Number(row[column]),
      isPlayer: row.player_id === playerId,
    }));
    const self = playerId ? state.players[playerId] : null;
    if (!self || Number(self[column]) <= 0) {
      return { boardId, rows: topRows, playerRank: null, source: 'online' };
    }
    const playerRank = rows.findIndex((row) => row.player_id === playerId) + 1;
    const playerRow = {
      rank: playerRank,
      playerId: self.player_id,
      displayName: self.display_name,
      avatarId: self.avatar_id,
      score: Number(self[column]),
      isPlayer: true,
    };
    if (topRows.some((row) => row.playerId === playerId)) {
      return {
        boardId,
        rows: topRows.map((row) => (row.playerId === playerId ? { ...row, isPlayer: true } : row)),
        playerRank,
        source: 'online',
      };
    }
    return {
      boardId,
      rows: [...topRows.slice(0, Math.max(0, limit - 1)), playerRow],
      playerRank,
      source: 'online',
    };
  }

  return {
    upsertFromPayload(rawPayload) {
      const payload = normalizeLeaderboardSubmit(rawPayload);
      const updatedAt = upsertPlayer(payload);
      return { ok: true, playerId: payload.playerId, updatedAt };
    },
    queryFromUrl(url) {
      const boardId = normalizeLeaderboardBoard(url.searchParams.get('board'));
      const playerId = String(url.searchParams.get('playerId') || '').trim().slice(0, 120);
      const limit = Number(url.searchParams.get('limit') || 6);
      return { ok: true, ...queryBoard({ boardId, playerId, limit }) };
    },
  };
}
