import {
  buildFeedbackPayload,
  validateFeedbackSelection,
} from './feedback-client.mjs';

const form = document.querySelector('#feedbackForm');
const statusNode = document.querySelector('#status');
const statusTopNode = document.querySelector('#statusTop');
const submitButton = document.querySelector('#submitButton');
const successOverlay = document.querySelector('#successOverlay');
const nextFeedbackButton = document.querySelector('#nextFeedbackButton');

const multiLimits = {
  favoriteParts: 2,
  painPoints: 2,
};

const fieldQuestionMap = {
  funRating: 0,
  replayIntent: 1,
  gender: 4,
  userSegment: 4,
  gameFrequency: 5,
  artFavoriteId: 6,
};

function getOrCreateId(key) {
  try {
    const current = localStorage.getItem(key);
    if (current) {
      return current;
    }
    const randomSource = globalThis.crypto;
    const id = randomSource?.randomUUID ? randomSource.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return 'anonymous';
  }
}

function readStoredNumber(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function getCheckedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function getRadioValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

function getSelection() {
  return {
    funRating: getRadioValue('funRating'),
    replayIntent: getRadioValue('replayIntent'),
    favoriteParts: getCheckedValues('favoriteParts'),
    painPoints: getCheckedValues('painPoints'),
    gender: getRadioValue('gender'),
    userSegment: getRadioValue('userSegment'),
    gameFrequency: getRadioValue('gameFrequency'),
    artFavoriteId: getRadioValue('artFavoriteId'),
    comment: String(new FormData(form).get('comment') || '').trim(),
  };
}

function showStatus(message, isSuccess = false) {
  for (const node of [statusNode, statusTopNode]) {
    node.textContent = message;
    node.classList.toggle('success', isSuccess);
  }
}

function clearMissingHighlights() {
  form.querySelectorAll('.missing').forEach((node) => node.classList.remove('missing'));
}

function highlightMissingFields(missingFields) {
  clearMissingHighlights();
  const questionNodes = [...form.querySelectorAll('.question')];
  const questionIndexes = [...new Set(missingFields.map((field) => fieldQuestionMap[field]).filter((value) => value >= 0))];
  for (const index of questionIndexes) {
    questionNodes[index]?.classList.add('missing');
  }
  for (const field of missingFields) {
    form.querySelectorAll(`input[name="${field}"]`).forEach((input) => {
      input.closest('.choice, .art-card')?.classList.add('missing');
    });
  }
  const first = questionNodes[questionIndexes[0]];
  first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

for (const [name, limit] of Object.entries(multiLimits)) {
  form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.addEventListener('change', () => {
      const selected = getCheckedValues(name);
      if (selected.length > limit) {
        input.checked = false;
        showStatus(`这个问题最多选择 ${limit} 个`);
      } else if (statusTopNode.textContent.includes('最多选择')) {
        showStatus('');
      }
    });
  });
}

form.addEventListener('change', () => {
  clearMissingHighlights();
  if (!statusTopNode.classList.contains('success')) {
    showStatus('');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const selection = getSelection();
  const validation = validateFeedbackSelection(selection);
  if (!validation.ok) {
    showStatus(validation.message);
    highlightMissingFields(validation.missingFields);
    return;
  }

  const payload = buildFeedbackPayload({
    selection,
    buildVersion: new URLSearchParams(location.search).get('v') || 'web-feedback',
    sessionId: getOrCreateId('BottleHeroFeedbackSessionV1'),
    playerId: getOrCreateId('BottleHeroAnonymousPlayerV1'),
    bestScore: readStoredNumber('BottleHeroBestScore'),
    playDurationSeconds: readStoredNumber('BottleHeroLastRunDurationSeconds'),
    reachedBoss: readStoredNumber('BottleHeroReachedBossV1') > 0,
    bossWin: readStoredNumber('BottleHeroBossWinV1') > 0,
  });

  submitButton.disabled = true;
  showStatus('正在提交...');

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || '提交失败');
    }
    showStatus('提交成功，已经记录。', true);
    successOverlay.classList.add('active');
    successOverlay.setAttribute('aria-hidden', 'false');
    form.reset();
    clearMissingHighlights();
    submitButton.disabled = false;
  } catch (error) {
    submitButton.disabled = false;
    showStatus(error instanceof Error ? error.message : '提交失败，请稍后重试');
  }
});

nextFeedbackButton.addEventListener('click', () => {
  successOverlay.classList.remove('active');
  successOverlay.setAttribute('aria-hidden', 'true');
  showStatus('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
