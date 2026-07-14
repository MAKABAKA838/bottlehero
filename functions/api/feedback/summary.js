import {
  buildFeedbackSummary,
  dbRowToFeedback,
  ensureFeedbackSchema,
  getFeedbackDb,
  jsonResponse,
} from '../../_shared/feedback.mjs';

export async function onRequestGet({ env }) {
  const db = getFeedbackDb(env);
  if (!db) {
    return jsonResponse({ ok: false, error: 'Feedback database is not configured.' }, { status: 503 });
  }

  await ensureFeedbackSchema(db);
  const result = await db.prepare(`
    SELECT *
    FROM feedback_responses
    ORDER BY created_at DESC
    LIMIT 500
  `).all();

  const rows = (result.results || []).map(dbRowToFeedback);
  return jsonResponse({
    ok: true,
    updatedAt: new Date().toISOString(),
    summary: buildFeedbackSummary(rows),
  });
}
