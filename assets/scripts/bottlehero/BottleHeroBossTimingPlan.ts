import {
  BottleHeroBalanceConfig,
  getTimingItemDefinition,
  TimingTargetKind,
  TimingTargetPlan,
} from './BottleHeroBalance';
import { getActiveLevelId } from './BottleHeroConfigLoader';
import { LevelId } from './BottleHeroGameConfig';

export function createBossTimingTargetPlan(
  balanceConfig: BottleHeroBalanceConfig,
  collectedRewardTimingItems: ReadonlySet<TimingTargetKind>,
  stageStateId: TimingTargetPlan['stageId'],
  levelId: LevelId = getActiveLevelId(),
): TimingTargetPlan {
  const targetCount = levelId === 'level_03'
    ? 3
    : levelId === 'level_01'
      ? (Math.random() < 0.7 ? 2 : 3)
      : (Math.random() < 0.45 ? 2 : 3);
  const kinds: TimingTargetKind[] = ['star'];
  const pool = balanceConfig.items.filter((item) => {
    if (!item.enabled || item.baseWeight <= 0 || kinds.indexOf(item.id) >= 0) {
      return false;
    }
    if (item.oneTimePerRun && collectedRewardTimingItems.has(item.id)) {
      return false;
    }
    return item.category === 'reward' || item.category === 'special';
  });
  while (kinds.length < targetCount && pool.length) {
    const total = pool.reduce((sum, item) => sum + Math.max(0, item.baseWeight), 0);
    let roll = Math.random() * Math.max(0.001, total);
    let selectedIndex = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= Math.max(0, pool[i].baseWeight);
      if (roll <= 0) {
        selectedIndex = i;
        break;
      }
    }
    const [selected] = pool.splice(selectedIndex, 1);
    if (selected) {
      kinds.push(selected.id);
    }
  }
  return {
    kinds,
    targetCount: kinds.length,
    rewardCount: kinds.filter((kind) => getTimingItemDefinition(balanceConfig, kind)?.category === 'reward').length,
    penaltyCount: 0,
    stageId: stageStateId,
    rewardPenaltyBias: -100,
  };
}
