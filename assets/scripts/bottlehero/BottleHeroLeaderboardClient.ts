import { EDITOR, PREVIEW } from 'cc/env';
import type { AvatarId } from './BottleHeroGameConfig';
import {
  buildLocalRankingRows,
  type LocalRankingRow,
} from './BottleHeroLocalRanking';
import {
  readRankingPlayerScore,
  readStoredLevelBestScores,
  readStoredTotalBestScore,
  type RankingBoardId,
} from './BottleHeroLevelBestScores';
import { readPageUrlSearchParams } from './BottleHeroStorage';
import { FEEDBACK_DEV_SERVER_PORT, FEEDBACK_PORT_URL_PARAM, shouldUseDevFeedbackServer } from './BottleHeroFeedbackEntry';

export const LEADERBOARD_BASE_URL_PARAM = 'bhLeaderboardBase';

export interface LeaderboardSubmitInput {
  playerId: string;
  displayName: string;
  avatarId: AvatarId;
  buildVersion?: string;
}

export interface LeaderboardFetchResult {
  rows: LocalRankingRow[];
  source: 'online' | 'local';
}

function readLocationSearch(): URLSearchParams {
  return readPageUrlSearchParams();
}

export function resolveLeaderboardApiUrl(): string {
  const search = readLocationSearch();
  const customBase = search.get(LEADERBOARD_BASE_URL_PARAM) || search.get('bhFeedbackBase');
  if (customBase) {
    const trimmed = customBase.replace(/\/$/, '');
    return trimmed.endsWith('/api/leaderboard') ? trimmed : `${trimmed}/api/leaderboard`;
  }
  if (PREVIEW || EDITOR || shouldUseDevFeedbackServer()) {
    const port = search.get(FEEDBACK_PORT_URL_PARAM) || String(FEEDBACK_DEV_SERVER_PORT);
    return `http://127.0.0.1:${port}/api/leaderboard`;
  }
  return './api/leaderboard';
}

function buildSubmitPayload(input: LeaderboardSubmitInput) {
  const levelScores = readStoredLevelBestScores();
  return {
    playerId: input.playerId,
    displayName: input.displayName.trim(),
    avatarId: input.avatarId,
    levelScores,
    totalScore: readStoredTotalBestScore(),
    buildVersion: input.buildVersion || 'level01-demo',
  };
}

export async function submitLeaderboardScores(input: LeaderboardSubmitInput): Promise<boolean> {
  if (!input.playerId || input.displayName.trim().length < 2) {
    return false;
  }
  try {
    const response = await fetch(resolveLeaderboardApiUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildSubmitPayload(input)),
      cache: 'no-store',
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

function mapOnlineRows(
  rows: Array<{
    rank: number;
    displayName: string;
    score: number;
    isPlayer?: boolean;
  }>,
  playerName: string,
): LocalRankingRow[] {
  return rows.map((row) => ({
    rank: row.rank,
    name: row.isPlayer ? playerName : row.displayName,
    score: Math.max(0, Math.round(row.score)),
    isPlayer: !!row.isPlayer,
  }));
}

export async function fetchLeaderboardBoard(
  boardId: RankingBoardId,
  playerId: string,
  playerName: string,
  maxRows = 6,
): Promise<LeaderboardFetchResult> {
  const playerScore = readRankingPlayerScore(boardId);
  const fallbackRows = buildLocalRankingRows(playerScore, boardId, {
    playerName,
    maxRows,
  });
  if (!playerId) {
    return { rows: fallbackRows, source: 'local' };
  }
  try {
    const url = new URL(resolveLeaderboardApiUrl(), globalThis.location?.href || 'http://localhost/');
    url.searchParams.set('board', boardId);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('limit', String(maxRows));
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return { rows: fallbackRows, source: 'local' };
    }
    const data = await response.json();
    if (!data?.ok || !Array.isArray(data.rows)) {
      return { rows: fallbackRows, source: 'local' };
    }
    const onlineRows = mapOnlineRows(data.rows, playerName);
    const hasOtherPlayers = onlineRows.some((row) => !row.isPlayer);
    if (onlineRows.length === 0 || !hasOtherPlayers) {
      return { rows: fallbackRows, source: 'local' };
    }
    return {
      rows: onlineRows,
      source: 'online',
    };
  } catch {
    return { rows: fallbackRows, source: 'local' };
  }
}
