import {
  getLeaderboardDb,
  jsonResponse,
  normalizeLeaderboardBoard,
  normalizeLeaderboardSubmit,
  queryLeaderboardBoard,
  upsertLeaderboardPlayer,
} from '../_shared/leaderboard.mjs';

export async function onRequestPost({ request, env }) {
  const db = getLeaderboardDb(env);
  if (!db) {
    return jsonResponse({ ok: false, error: 'Leaderboard database is not configured.' }, { status: 503 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  let normalized;
  try {
    normalized = normalizeLeaderboardSubmit(payload);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid leaderboard payload.',
    }, { status: 400 });
  }

  const updatedAt = await upsertLeaderboardPlayer(db, normalized);
  return jsonResponse({ ok: true, playerId: normalized.playerId, updatedAt });
}

export async function onRequestGet({ request, env }) {
  const db = getLeaderboardDb(env);
  if (!db) {
    return jsonResponse({ ok: false, error: 'Leaderboard database is not configured.' }, { status: 503 });
  }

  const url = new URL(request.url);
  let boardId;
  try {
    boardId = normalizeLeaderboardBoard(url.searchParams.get('board'));
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid board.',
    }, { status: 400 });
  }

  const playerId = String(url.searchParams.get('playerId') || '').trim().slice(0, 120);
  const limit = Number(url.searchParams.get('limit') || 6);
  const result = await queryLeaderboardBoard(db, { boardId, playerId, limit });
  return jsonResponse({ ok: true, ...result });
}
