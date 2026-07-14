import { sys } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';
import { readStoredTotalBestScore } from './BottleHeroLevelBestScores';
import type { AvatarId } from './BottleHeroGameConfig';
import { bottleHeroStorageKeys, readStoredNumber, writeStoredString } from './BottleHeroStorage';

export const FEEDBACK_DEV_SERVER_PORT = 4173;
export const FEEDBACK_PORT_URL_PARAM = 'bhFeedbackPort';
export const FEEDBACK_BASE_URL_PARAM = 'bhFeedbackBase';

export interface FeedbackSurveyParams {
  bestScore: number;
  score: number;
  avatarId: AvatarId;
  versionTag?: string;
}

export function buildFeedbackSurveyQuery(params: FeedbackSurveyParams): URLSearchParams {
  const query = new URLSearchParams();
  query.set('v', params.versionTag ?? 'level01-demo-20260612');
  query.set('best', String(Math.round(params.bestScore)));
  query.set('score', String(Math.round(params.score)));
  query.set('avatar', params.avatarId);
  return query;
}

function readLocationSearch(): URLSearchParams | null {
  if (typeof globalThis.location?.search !== 'string') {
    return null;
  }
  return new URLSearchParams(globalThis.location.search);
}

function isCreatorPreviewPort(port: string): boolean {
  return port === '7456' || port === '7457';
}

/** Creator 预览服不含 feedback.html，需改走本地静态服。 */
export function shouldUseDevFeedbackServer(): boolean {
  if (PREVIEW || EDITOR) {
    return true;
  }
  const port = globalThis.location?.port;
  return typeof port === 'string' && isCreatorPreviewPort(port);
}

export function resolveFeedbackPagePath(): string {
  const search = readLocationSearch();
  const customBase = search?.get(FEEDBACK_BASE_URL_PARAM);
  if (customBase) {
    return customBase;
  }

  if (shouldUseDevFeedbackServer()) {
    const port = search?.get(FEEDBACK_PORT_URL_PARAM) || String(FEEDBACK_DEV_SERVER_PORT);
    return `http://127.0.0.1:${port}/feedback.html`;
  }

  return './feedback.html';
}

export function resolveFeedbackSurveyUrl(
  params: FeedbackSurveyParams,
  pagePath: string = resolveFeedbackPagePath(),
): string {
  const query = buildFeedbackSurveyQuery(params).toString();
  if (pagePath.startsWith('http://') || pagePath.startsWith('https://')) {
    const separator = pagePath.includes('?') ? '&' : '?';
    return `${pagePath}${separator}${query}`;
  }

  const relative = `${pagePath}?${query}`;
  if (typeof globalThis.location?.href === 'string') {
    return new URL(relative, globalThis.location.href).href;
  }
  return relative;
}

export function buildFeedbackSurveyUrl(params: FeedbackSurveyParams, pagePath?: string): string {
  return resolveFeedbackSurveyUrl(params, pagePath);
}

export function persistFeedbackRunStats(input: {
  runElapsedSeconds: number;
  bossTriggeredThisRun: boolean;
  bossBattleActive: boolean;
  bossWin: boolean;
}): void {
  writeStoredString(bottleHeroStorageKeys.lastRunDurationSeconds, String(Math.round(input.runElapsedSeconds || 0)));
  writeStoredString(
    bottleHeroStorageKeys.reachedBoss,
    input.bossTriggeredThisRun || input.bossBattleActive || input.bossWin ? '1' : '0',
  );
  writeStoredString(bottleHeroStorageKeys.bossWin, input.bossWin ? '1' : '0');
}

function openFeedbackUrl(url: string): void {
  const openInNewTab = shouldUseDevFeedbackServer();

  if (openInNewTab) {
    if (sys?.openURL) {
      sys.openURL(url);
      return;
    }
    if (typeof globalThis.open === 'function') {
      globalThis.open(url, '_blank');
      return;
    }
  }

  if (typeof globalThis.location?.assign === 'function') {
    globalThis.location.assign(url);
    return;
  }

  if (sys?.openURL) {
    sys.openURL(url);
    return;
  }

  if (typeof globalThis.open === 'function') {
    globalThis.open(url, '_self');
    return;
  }

  const legacyWindow = (globalThis as { window?: { location?: { href: string } } }).window;
  if (legacyWindow?.location) {
    legacyWindow.location.href = url;
  }
}

export function openFeedbackSurveyInBrowser(params: FeedbackSurveyParams, pagePath?: string): void {
  openFeedbackUrl(resolveFeedbackSurveyUrl(params, pagePath));
}

export function readBestScoreForFeedback(_currentBest: number): number {
  return readStoredTotalBestScore();
}
