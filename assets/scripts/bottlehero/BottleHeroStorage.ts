import { sys } from 'cc';
import type { AvatarGoodsAttachSocket, AvatarGoodsId, AvatarId, LevelId } from './BottleHeroGameConfig';
import { getAvatarConfig } from './BottleHeroConfigLoader';
import type { HandPreference } from './BottleHeroTypes';

export const bottleHeroStorageKeys = {
  debugBalanceConfig: 'BottleHeroFiveStageBalanceConfigV1',
  legacyDebugBalanceConfig: 'BottleHeroDebugBalanceConfig',
  handPreference: 'BottleHeroHandPreferenceV1',
  avatarSelected: 'BottleHeroAvatarSelectedV1',
  avatarId: 'BottleHeroAvatarIdV1',
  avatarGoods: 'BottleHeroAvatarGoodsV1',
  avatarGoodsLoadout: 'BottleHeroAvatarGoodsLoadoutV1',
  bestScore: 'BottleHeroBestScore',
  bestTitleIndex: 'BottleHeroBestTitleIndex',
  lastRunDurationSeconds: 'BottleHeroLastRunDurationSeconds',
  reachedBoss: 'BottleHeroReachedBossV1',
  bossWin: 'BottleHeroBossWinV1',
  unlockedLevels: 'BottleHeroUnlockedLevelsV1',
  avatarUnlockedGoods: 'BottleHeroAvatarUnlockedGoodsV1',
  playerId: 'BottleHeroPlayerIdV1',
  playerName: 'BottleHeroPlayerNameV1',
} as const;

export function getDebugBalanceStorageKey(levelId: LevelId): string {
  return `${bottleHeroStorageKeys.debugBalanceConfig}_${levelId}`;
}

export function readDebugBalanceOverride(levelId: LevelId): string | null {
  const perLevel = sys.localStorage.getItem(getDebugBalanceStorageKey(levelId));
  if (perLevel) {
    return perLevel;
  }
  if (levelId === 'level_01') {
    return sys.localStorage.getItem(bottleHeroStorageKeys.debugBalanceConfig)
      || sys.localStorage.getItem(bottleHeroStorageKeys.legacyDebugBalanceConfig);
  }
  return null;
}

export function clearDebugBalanceOverride(levelId: LevelId): void {
  removeStored(getDebugBalanceStorageKey(levelId));
  if (levelId === 'level_01') {
    removeStored(bottleHeroStorageKeys.debugBalanceConfig);
    removeStored(bottleHeroStorageKeys.legacyDebugBalanceConfig);
  }
}

export function readStoredNumber(key: string, fallback: number): number {
  const value = Number(sys.localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

export function readStoredIntInRange(key: string, min: number, max: number, fallback: number): number {
  const value = Math.floor(readStoredNumber(key, fallback));
  return Math.max(min, Math.min(max, value));
}

export function writeStoredString(key: string, value: string): void {
  sys.localStorage.setItem(key, value);
}

export function readPageUrlSearchParams(): URLSearchParams {
  const candidates: Array<typeof globalThis | null | undefined> = [globalThis];
  try {
    if (globalThis.parent && globalThis.parent !== globalThis) {
      candidates.push(globalThis.parent);
    }
  } catch {
    // Cross-origin parent; ignore.
  }
  try {
    if (globalThis.top && globalThis.top !== globalThis) {
      candidates.push(globalThis.top);
    }
  } catch {
    // Cross-origin top; ignore.
  }
  for (const candidate of candidates) {
    try {
      const search = candidate?.location?.search;
      if (typeof search === 'string' && search.length > 1) {
        return new URLSearchParams(search);
      }
    } catch {
      // Cross-origin frame; ignore.
    }
  }
  return new URLSearchParams();
}

export function removeStored(key: string): void {
  sys.localStorage.removeItem(key);
}

export function readStoredHandPreference(): { preference: HandPreference; saved: boolean } {
  const saved = sys.localStorage.getItem(bottleHeroStorageKeys.handPreference);
  if (saved === 'left' || saved === 'right') {
    return { preference: saved, saved: true };
  }
  return { preference: 'right', saved: false };
}

export function writeStoredHandPreference(preference: HandPreference): void {
  writeStoredString(bottleHeroStorageKeys.handPreference, preference);
}

export interface StoredPlayerProfile {
  playerId: string;
  playerName: string;
}

export function readStoredPlayerProfile(): StoredPlayerProfile {
  const savedId = sys.localStorage.getItem(bottleHeroStorageKeys.playerId);
  const savedName = sys.localStorage.getItem(bottleHeroStorageKeys.playerName);
  const playerId = savedId && savedId.trim().length > 0 ? savedId : generateAnonymousPlayerId();
  if (playerId !== savedId) {
    writeStoredString(bottleHeroStorageKeys.playerId, playerId);
  }
  return {
    playerId,
    playerName: typeof savedName === 'string' ? savedName.trim() : '',
  };
}

export function writeStoredPlayerName(name: string): void {
  writeStoredString(bottleHeroStorageKeys.playerName, name.trim());
}

export function clearStoredPlayerName(): void {
  removeStored(bottleHeroStorageKeys.playerName);
}

/** 内测 URL：`?bhClearName=1` 启动时清空已存昵称，强制重新输入。 */
export function shouldClearPlayerNameFromUrl(): boolean {
  const params = readPageUrlSearchParams();
  const raw = params.get('bhClearName') ?? params.get('bhForceNickname');
  return raw === '1' || raw === 'true';
}

export function isValidPlayerName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 16;
}

function generateAnonymousPlayerId(): string {
  return `bh_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xfffff).toString(36)}`;
}

export interface StoredAvatarState {
  selectedAvatarId: AvatarId;
  avatarSelectionPreviewId: AvatarId;
  avatarSelectionSaved: boolean;
  selectedAvatarGoodsId: AvatarGoodsId;
  equippedAvatarGoodsBySocket: Partial<Record<AvatarGoodsAttachSocket, AvatarGoodsId>>;
}

export function readStoredAvatarState(defaultAvatarId: AvatarId = 'cat02'): StoredAvatarState {
  const savedAvatar = sys.localStorage.getItem(bottleHeroStorageKeys.avatarId);
  const selectedAvatarId = isAvatarId(savedAvatar) ? savedAvatar : defaultAvatarId;
  const avatarSelectionSaved = sys.localStorage.getItem(bottleHeroStorageKeys.avatarSelected) === '1'
    && isAvatarId(selectedAvatarId);
  const savedGoods = sys.localStorage.getItem(bottleHeroStorageKeys.avatarGoods);
  const selectedAvatarGoodsId = isAvatarGoodsId(savedGoods) ? savedGoods : 'none';
  const equippedAvatarGoodsBySocket: Partial<Record<AvatarGoodsAttachSocket, AvatarGoodsId>> = {};
  const savedLoadoutRaw = sys.localStorage.getItem(bottleHeroStorageKeys.avatarGoodsLoadout);
  if (savedLoadoutRaw) {
    try {
      const parsed = JSON.parse(savedLoadoutRaw) as Partial<Record<AvatarGoodsAttachSocket, unknown>>;
      const sockets: AvatarGoodsAttachSocket[] = ['head', 'hand', 'body', 'feet'];
      for (const socket of sockets) {
        const value = parsed[socket];
        if (isAvatarGoodsId(value)) {
          equippedAvatarGoodsBySocket[socket] = value;
        }
      }
    } catch {
      // Ignore malformed saved loadout and fall back to legacy single-goods mode.
    }
  }
  if (Object.keys(equippedAvatarGoodsBySocket).length === 0 && selectedAvatarGoodsId !== 'none') {
    const goods = getAvatarConfig().goods.find((item) => item.id === selectedAvatarGoodsId);
    const socket = goods?.attachSocket ?? 'head';
    equippedAvatarGoodsBySocket[socket] = selectedAvatarGoodsId;
  }
  return {
    selectedAvatarId,
    avatarSelectionPreviewId: selectedAvatarId,
    avatarSelectionSaved,
    selectedAvatarGoodsId,
    equippedAvatarGoodsBySocket,
  };
}

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && getAvatarConfig().avatars.some((avatar) => avatar.id === value);
}

export function isAvatarGoodsId(value: unknown): value is AvatarGoodsId {
  return value === 'none' || (typeof value === 'string' && getAvatarConfig().goods.some((goods) => goods.id === value));
}
