import {
  ensureFeedbackSchema,
  getFeedbackDb,
  jsonResponse,
  normalizeFeedbackPayload,
} from '../_shared/feedback.mjs';

export async function onRequestPost({ request, env }) {
  const db = getFeedbackDb(env);
  if (!db) {
    return jsonResponse({ ok: false, error: 'Feedback database is not configured.' }, { status: 503 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  let feedback;
  try {
    feedback = normalizeFeedbackPayload({
      ...payload,
      userAgent: request.headers.get('user-agent') || payload.userAgent || '',
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Invalid feedback.' }, { status: 400 });
  }

  await ensureFeedbackSchema(db);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.prepare(`
    INSERT INTO feedback_responses (
      id, created_at, survey_version, build_version, session_id, player_id,
      best_score, play_duration_seconds, reached_boss, boss_win,
      fun_rating, replay_intent, favorite_parts, pain_points,
      gender, user_segment, game_frequency, art_favorite_id, art_dislike_id,
      comment, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    createdAt,
    feedback.surveyVersion,
    feedback.buildVersion,
    feedback.sessionId,
    feedback.playerId,
    feedback.bestScore,
    feedback.playDurationSeconds,
    feedback.reachedBoss ? 1 : 0,
    feedback.bossWin ? 1 : 0,
    feedback.funRating,
    feedback.replayIntent,
    JSON.stringify(feedback.favoriteParts),
    JSON.stringify(feedback.painPoints),
    feedback.gender,
    feedback.userSegment,
    feedback.gameFrequency,
    feedback.artFavoriteId,
    feedback.artDislikeId,
    feedback.comment,
    feedback.userAgent,
  ).run();

  return jsonResponse({ ok: true, id, createdAt });
}

export async function onRequestGet() {
  return jsonResponse({ ok: true, status: 'Bottlehero feedback API is ready.' });
}
