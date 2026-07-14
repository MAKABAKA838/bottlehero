import {
  AvatarDefinitionConfig,
  AvatarGoodsDefinitionConfig,
  AvatarGoodsId,
  AvatarId,
} from './BottleHeroGameConfig';
import { getActiveLevelConfig, getAvatarConfig } from './BottleHeroConfigLoader';
import { isAvatarGoodsId, isAvatarId } from './BottleHeroStorage';

export { isAvatarId, isAvatarGoodsId };

export function getAvatarDefinition(avatarId: AvatarId): AvatarDefinitionConfig {
  const avatars = getAvatarConfig().avatars;
  return avatars.find((avatar) => avatar.id === avatarId) || avatars[1];
}

export function getAvatarGoodsDefinition(goodsId: AvatarGoodsId): AvatarGoodsDefinitionConfig | null {
  if (goodsId === 'none') {
    return null;
  }
  return getAvatarConfig().goods.find((goods) => goods.id === goodsId) || null;
}

export function getStagedThrowItemFiles(): readonly string[] {
  return getActiveLevelConfig().throwItems;
}

export function getAvatarHomeNormalY(): number {
  return getAvatarConfig().homeLayout.normalY;
}

export function getAvatarHomeFocusY(): number {
  return getAvatarConfig().homeLayout.focusY;
}

export function getAvatarHomeFocusScale(): number {
  return getAvatarConfig().homeLayout.focusScale;
}
