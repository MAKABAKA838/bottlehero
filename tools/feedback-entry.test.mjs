import assert from 'node:assert/strict';

function buildFeedbackSurveyQuery(params) {
  const query = new URLSearchParams();
  query.set('v', params.versionTag ?? 'level01-demo-20260612');
  query.set('best', String(Math.round(params.bestScore)));
  query.set('score', String(Math.round(params.score)));
  query.set('avatar', params.avatarId);
  return query;
}

function resolveFeedbackSurveyUrl(params, pagePath, baseHref = 'http://127.0.0.1:4173/index.html') {
  const query = buildFeedbackSurveyQuery(params).toString();
  if (pagePath.startsWith('http://') || pagePath.startsWith('https://')) {
    const separator = pagePath.includes('?') ? '&' : '?';
    return `${pagePath}${separator}${query}`;
  }
  return new URL(`${pagePath}?${query}`, baseHref).href;
}

const params = {
  bestScore: 1200,
  score: 300,
  avatarId: 'cat04',
};

assert.equal(
  resolveFeedbackSurveyUrl(params, './feedback.html', 'http://127.0.0.1:4173/index.html'),
  'http://127.0.0.1:4173/feedback.html?v=level01-demo-20260612&best=1200&score=300&avatar=cat04',
);

assert.equal(
  resolveFeedbackSurveyUrl(params, 'http://127.0.0.1:4173/feedback.html', 'http://127.0.0.1:7456/'),
  'http://127.0.0.1:4173/feedback.html?v=level01-demo-20260612&best=1200&score=300&avatar=cat04',
);

console.log('feedback entry tests passed');
