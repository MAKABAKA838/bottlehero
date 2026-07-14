import { sys } from 'cc';
import type { AvatarGoodsId } from './BottleHeroGameConfig';
import { getAvatarGoodsDefinition } from './BottleHeroAvatarRuntime';
import {
  bottleHeroStorageKeys,
  isAvatarGoodsId,
  writeStoredString,
} from './BottleHeroStorage';

let lastGrantedBossRewardGoods: AvatarGoodsId[] = [];

function persistUnlockedAvatarGoods(unlocked: Set<AvatarGoodsId>): void {
  writeStoredString(
    bottleHeroStorageKeys.avatarUnlockedGoods,
    JSON.stringify([...unlocked]),
  );
}

function readPersistedUnlockedAvatarGoods(): Set<AvatarGoodsId> {
  const raw = sys.localStorage.getItem(bottleHeroStorageKeys.avatarUnlockedGoods);
  if (!raw) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    const unlocked = new Set<AvatarGoodsId>();
    for (const entry of parsed) {
      if (isAvatarGoodsId(entry) && entry !== 'none') {
        unlocked.add(entry);
      }
    }
    return unlocked;
  } catch {
    return new Set();
  }
}

export function isPlayerAvatarGoodsUnlocked(goodsId: AvatarGoodsId): boolean {
  const goods = getAvatarGoodsDefinition(goodsId);
  return !!goods && goods.unlocked;
}

export function unlockAvatarGoods(goodsId: AvatarGoodsId): boolean {
  if (goodsId === 'none') {
    return false;
  }
  const unlocked = readPersistedUnlockedAvatarGoods();
  if (unlocked.has(goodsId)) {
    return false;
  }
  unlocked.add(goodsId);
  persistUnlockedAvatarGoods(unlocked);
  return true;
}

export function grantRandomBossRewardGoods(pool: readonly AvatarGoodsId[]): AvatarGoodsId[] {
  const validPool = pool.filter((id) => id !== 'none');
  if (validPool.length === 0) {
    lastGrantedBossRewardGoods = [];
    return [];
  }
  const pick = validPool[Math.floor(Math.random() * validPool.length)];
  unlockAvatarGoods(pick);
  lastGrantedBossRewardGoods = [pick];
  return lastGrantedBossRewardGoods;
}

export function getLastGrantedBossRewardGoods(): readonly AvatarGoodsId[] {
  return lastGrantedBossRewardGoods;
}
