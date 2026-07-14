import { sys } from 'cc';
import type { LevelId } from './BottleHeroGameConfig';
import { bottleHeroStorageKeys, writeStoredString } from './BottleHeroStorage';

const defaultUnlocked: LevelId[] = ['level_01'];

export function readUnlockedLevels(): Set<LevelId> {
  const unlocked = new Set<LevelId>(defaultUnlocked);
  const raw = sys.localStorage.getItem(bottleHeroStorageKeys.unlockedLevels);
  if (!raw) {
    return unlocked;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return unlocked;
    }
    for (const entry of parsed) {
      if (entry === 'level_01' || entry === 'level_02' || entry === 'level_03') {
        unlocked.add(entry);
      }
    }
  } catch {
    return unlocked;
  }
  return unlocked;
}

export function isLevelUnlocked(levelId: LevelId): boolean {
  return readUnlockedLevels().has(levelId);
}

export function unlockLevel(levelId: LevelId): void {
  const unlocked = readUnlockedLevels();
  if (unlocked.has(levelId)) {
    return;
  }
  unlocked.add(levelId);
  writeStoredString(bottleHeroStorageKeys.unlockedLevels, JSON.stringify([...unlocked]));
}

export function getLevelUnlockedAfterBossWin(completedLevelId: LevelId): LevelId | null {
  if (completedLevelId === 'level_01') {
    return 'level_02';
  }
  if (completedLevelId === 'level_02') {
    return 'level_03';
  }
  return null;
}
