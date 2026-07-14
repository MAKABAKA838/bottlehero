import { sys } from 'cc';
import { playableLevelIds, type LevelId } from './BottleHeroGameConfig';
import { bottleHeroStorageKeys, readPageUrlSearchParams, readStoredNumber, removeStored, writeStoredString } from './BottleHeroStorage';

export type RankingBoardId = LevelId | 'total';

export function getLevelBestScoreStorageKey(levelId: LevelId): string {
  return `${bottleHeroStorageKeys.bestScore}_${levelId}`;
}

export function readStoredLevelBestScore(levelId: LevelId): number {
  ensureLevelBestScoresMigrated();
  return Math.max(0, Math.round(readStoredNumber(getLevelBestScoreStorageKey(levelId), 0)));
}

export function readStoredLevelBestScores(): Record<LevelId, number> {
  ensureLevelBestScoresMigrated();
  return {
    level_01: readStoredLevelBestScore('level_01'),
    level_02: readStoredLevelBestScore('level_02'),
    level_03: readStoredLevelBestScore('level_03'),
  };
}

export function readStoredTotalBestScore(): number {
  const scores = readStoredLevelBestScores();
  return playableLevelIds.reduce((sum, levelId) => sum + scores[levelId], 0);
}

export function setStoredLevelBestScore(levelId: LevelId, score: number): void {
  const safe = Math.max(0, Math.round(score));
  writeStoredString(getLevelBestScoreStorageKey(levelId), String(safe));
  syncLegacyBestScoreFromLevels();
}

/** 将本局分数并入关卡 BEST（若更高则写入存储）。 */
export function persistLevelBestScore(levelId: LevelId, runScore: number): number {
  const best = Math.max(readStoredLevelBestScore(levelId), Math.max(0, Math.round(runScore)));
  setStoredLevelBestScore(levelId, best);
  return best;
}

export function setStoredLevelBestScores(scores: Partial<Record<LevelId, number>>): void {
  for (const levelId of playableLevelIds) {
    if (scores[levelId] !== undefined) {
      setStoredLevelBestScore(levelId, scores[levelId]!);
    }
  }
}

export function clearStoredLevelBestScores(): void {
  for (const levelId of playableLevelIds) {
    removeStored(getLevelBestScoreStorageKey(levelId));
  }
  removeStored(bottleHeroStorageKeys.bestScore);
}

export function readRankingPlayerScore(boardId: RankingBoardId): number {
  if (boardId === 'total') {
    return readStoredTotalBestScore();
  }
  return readStoredLevelBestScore(boardId);
}

let levelBestScoresMigrated = false;

/** 将旧版全局 `BottleHeroBestScore` 迁移到 level_01。 */
export function ensureLevelBestScoresMigrated(): void {
  if (levelBestScoresMigrated) {
    return;
  }
  levelBestScoresMigrated = true;
  const hasPerLevel = playableLevelIds.some(
    (levelId) => sysHasItem(getLevelBestScoreStorageKey(levelId)),
  );
  if (hasPerLevel) {
    syncLegacyBestScoreFromLevels();
    return;
  }
  const legacy = Math.max(0, Math.round(readStoredNumber(bottleHeroStorageKeys.bestScore, 0)));
  if (legacy > 0) {
    writeStoredString(getLevelBestScoreStorageKey('level_01'), String(legacy));
  }
  syncLegacyBestScoreFromLevels();
}

function sysHasItem(key: string): boolean {
  return sys.localStorage.getItem(key) !== null;
}

function syncLegacyBestScoreFromLevels(): void {
  writeStoredString(bottleHeroStorageKeys.bestScore, String(readStoredTotalBestScore()));
}

function parseBestScoreLevelParam(raw: string | null): LevelId {
  if (raw === 'level_01' || raw === 'level_02' || raw === 'level_03') {
    return raw;
  }
  if (raw === '1') {
    return 'level_01';
  }
  if (raw === '2') {
    return 'level_02';
  }
  if (raw === '3') {
    return 'level_03';
  }
  return 'level_01';
}

/** 启动时读取 `?bhBest=240000&bhBestLevel=level_02` 写入对应关卡 BEST（内测调试用）。 */
export function applyBestScoreUrlOverride(): number | null {
  const params = readPageUrlSearchParams();
  const raw = params.get('bhBest');
  if (raw === null) {
    return null;
  }
  const value = Math.round(Number(raw));
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  const levelId = parseBestScoreLevelParam(params.get('bhBestLevel'));
  setStoredLevelBestScore(levelId, value);
  return readRankingPlayerScore('total');
}
