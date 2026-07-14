import { playableLevelIds, type LevelId } from './BottleHeroGameConfig';
import type { RankingBoardId } from './BottleHeroLevelBestScores';

export interface LocalRankingEntry {
  name: string;
  score: number;
  isPlayer?: boolean;
}

export interface LocalRankingRow extends LocalRankingEntry {
  rank: number;
}

export interface LocalRankingMockPlayer {
  name: string;
  levelScores: Record<LevelId, number>;
}

/** Demo 占位对手；各关分数之和构成总榜。 */
export const LOCAL_RANKING_MOCK_PLAYERS: readonly LocalRankingMockPlayer[] = [
  { name: 'USER:JACK', levelScores: { level_01: 352400, level_02: 398600, level_03: 372400 } },
  { name: 'USER:RONE', levelScores: { level_01: 178200, level_02: 191500, level_03: 193088 } },
  { name: 'USER:RICH', levelScores: { level_01: 142000, level_02: 156000, level_03: 152000 } },
  { name: 'USER:WONG', levelScores: { level_01: 138500, level_02: 149200, level_03: 151300 } },
  { name: 'USER:LILEI', levelScores: { level_01: 72000, level_02: 78000, level_03: 80000 } },
  { name: 'USER:ZHANG', levelScores: { level_01: 58000, level_02: 62000, level_03: 67000 } },
];

export function getMockPlayerBoardScore(player: LocalRankingMockPlayer, boardId: RankingBoardId): number {
  if (boardId === 'total') {
    return playableLevelIds.reduce((sum, levelId) => sum + player.levelScores[levelId], 0);
  }
  return player.levelScores[boardId];
}

export function buildLocalRankingRows(
  playerScore: number,
  boardId: RankingBoardId,
  options: { playerName?: string; maxRows?: number } = {},
): LocalRankingRow[] {
  const maxRows = options.maxRows ?? 6;
  const playerLabel = options.playerName?.trim() || 'YOU';
  const safeScore = Math.max(0, Math.round(playerScore));
  const entries: LocalRankingEntry[] = [
    ...LOCAL_RANKING_MOCK_PLAYERS.map((player) => ({
      name: player.name,
      score: getMockPlayerBoardScore(player, boardId),
    })),
    { name: playerLabel, score: safeScore, isPlayer: true },
  ];
  const ranked = entries
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  const playerRow = ranked.find((row) => row.isPlayer);
  if (!playerRow || playerRow.rank <= maxRows) {
    return ranked.slice(0, maxRows);
  }
  const topOthers = ranked.filter((row) => !row.isPlayer).slice(0, maxRows - 1);
  return [...topOthers, playerRow];
}

export function getRankingBoardLabel(boardId: RankingBoardId, language: 'zh' | 'en' = 'zh'): string {
  if (boardId === 'total') {
    return language === 'zh' ? '总榜' : 'TOTAL';
  }
  const levelNumber = boardId === 'level_01' ? 1 : boardId === 'level_02' ? 2 : 3;
  return language === 'zh' ? `关卡 ${levelNumber}` : `LEVEL ${levelNumber}`;
}

export const RANKING_BOARD_IDS: readonly RankingBoardId[] = ['total', ...playableLevelIds];
