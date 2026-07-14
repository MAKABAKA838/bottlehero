import { JsonAsset, resources } from 'cc';
import {
  BottleHeroBalanceConfig,
  defaultBottleHeroBalance,
  mergeBalanceConfig,
} from './BottleHeroBalance';
import {
  AvatarConfigFile,
  AvatarGoodsConfigFile,
  BossConfigFile,
  fallbackAvatarConfig,
  fallbackLevel01Config,
  fallbackLevel01Rewards,
  fallbackLevel02Config,
  fallbackLevel02Rewards,
  fallbackLevel03Config,
  fallbackLevel03Rewards,
  getLevelThrowItemPaths,
  LevelConfigFile,
  LevelId,
  LevelRewardsConfigFile,
  playableLevelIds,
  TimingItemsConfigFile,
  TimingPointsConfigFile,
} from './BottleHeroGameConfig';

export function loadJsonResource<T>(resourcePath: string): Promise<T> {
  return new Promise((resolve, reject) => {
    resources.load(resourcePath, JsonAsset, (error, asset) => {
      if (error || !asset) {
        reject(error || new Error(`Config not found: ${resourcePath}`));
        return;
      }
      resolve(asset.json as T);
    });
  });
}

async function loadOptionalJsonResource<T>(resourcePath: string): Promise<T | null> {
  try {
    return await loadJsonResource<T>(resourcePath);
  } catch {
    return null;
  }
}

async function loadSplitBalanceLayers(bossId: string): Promise<Partial<BottleHeroBalanceConfig>> {
  const [points, items, boss] = await Promise.all([
    loadOptionalJsonResource<TimingPointsConfigFile>('bottlehero/config/timing/points'),
    loadOptionalJsonResource<TimingItemsConfigFile>('bottlehero/config/timing/items'),
    loadOptionalJsonResource<BossConfigFile>(`bottlehero/config/bosses/${bossId}`),
  ]);
  const patch: Partial<BottleHeroBalanceConfig> = {};
  if (Array.isArray(points?.timingPointTiers) && points.timingPointTiers.length) {
    patch.timingPointTiers = points.timingPointTiers;
  }
  if (Array.isArray(items?.items) && items.items.length) {
    patch.items = items.items;
  }
  if (boss?.balance) {
    patch.boss = boss.balance;
    cachedBossConfigById[bossId] = boss;
  }
  return patch;
}

function normalizeBalanceResourcePath(resourcePath: string): string {
  return resourcePath.replace(/^\//, '').replace(/\.json$/i, '');
}

const cachedPackagedBalanceByLevel: Partial<Record<LevelId, BottleHeroBalanceConfig>> = {};
const cachedPackagedMetaByLevel: Partial<Record<LevelId, { balancePath: string; bossId: string }>> = {};
const cachedBossConfigById: Partial<Record<string, BossConfigFile>> = {};

export async function loadPackagedBalanceConfigForLevel(levelId: LevelId = activeLevelId): Promise<BottleHeroBalanceConfig> {
  const level = getLevelConfig(levelId);
  const balancePath = normalizeBalanceResourcePath(level.balanceConfig);
  const bossId = level.boss.id;
  const cachedMeta = cachedPackagedMetaByLevel[levelId];
  const cached = cachedPackagedBalanceByLevel[levelId];
  if (cached && cachedMeta?.balancePath === balancePath && cachedMeta.bossId === bossId) {
    return cached;
  }
  try {
    const [core, split] = await Promise.all([
      loadJsonResource<Partial<BottleHeroBalanceConfig>>(balancePath),
      loadSplitBalanceLayers(bossId),
    ]);
    const merged = mergeBalanceConfig({ ...core, ...split });
    cachedPackagedBalanceByLevel[levelId] = merged;
    cachedPackagedMetaByLevel[levelId] = { balancePath, bossId };
    return merged;
  } catch (error) {
    console.warn(`BottleHero balance config missing for ${levelId} (${balancePath}), using code fallback.`, error);
    const fallback = mergeBalanceConfig(defaultBottleHeroBalance);
    cachedPackagedBalanceByLevel[levelId] = fallback;
    cachedPackagedMetaByLevel[levelId] = { balancePath: 'fallback', bossId };
    return fallback;
  }
}

let cachedAvatarConfig: AvatarConfigFile = fallbackAvatarConfig;

export function getAvatarConfig(): AvatarConfigFile {
  return cachedAvatarConfig;
}

export async function loadAvatarConfig(): Promise<AvatarConfigFile> {
  try {
    const [raw, goodsFile] = await Promise.all([
      loadJsonResource<Partial<AvatarConfigFile>>('bottlehero/config/avatars/avatars'),
      loadOptionalJsonResource<AvatarGoodsConfigFile>('bottlehero/config/avatars/goods'),
    ]);
    const goods = goodsFile?.goods ?? raw.goods ?? fallbackAvatarConfig.goods;
    if (!Array.isArray(raw.avatars) || !Array.isArray(goods)) {
      throw new Error('Invalid avatar config shape');
    }
    cachedAvatarConfig = {
      avatars: raw.avatars,
      goods,
      homeLayout: raw.homeLayout ?? fallbackAvatarConfig.homeLayout,
    };
  } catch (error) {
    console.warn('BottleHero avatar config missing, using code fallback.', error);
    cachedAvatarConfig = fallbackAvatarConfig;
  }
  return cachedAvatarConfig;
}

const levelFallbacks: Record<LevelId, LevelConfigFile> = {
  level_01: fallbackLevel01Config,
  level_02: fallbackLevel02Config,
  level_03: fallbackLevel03Config,
};

const rewardsFallbacks: Record<LevelId, LevelRewardsConfigFile> = {
  level_01: fallbackLevel01Rewards,
  level_02: fallbackLevel02Rewards,
  level_03: fallbackLevel03Rewards,
};

const cachedLevelConfigs: Partial<Record<LevelId, LevelConfigFile>> = {
  level_01: {
    ...fallbackLevel01Config,
    throwItems: getLevelThrowItemPaths('level_01'),
  },
};

const cachedLevelRewards: Partial<Record<LevelId, LevelRewardsConfigFile>> = {
  level_01: fallbackLevel01Rewards,
  level_02: fallbackLevel02Rewards,
  level_03: fallbackLevel03Rewards,
};

let activeLevelId: LevelId = 'level_01';

export function setActiveLevelId(levelId: LevelId) {
  activeLevelId = levelId;
}

export function getActiveLevelId(): LevelId {
  return activeLevelId;
}

export async function ensureBossConfigLoaded(bossId: string): Promise<BossConfigFile> {
  const cached = cachedBossConfigById[bossId];
  if (cached) {
    return cached;
  }
  const boss = await loadOptionalJsonResource<BossConfigFile>(`bottlehero/config/bosses/${bossId}`);
  if (boss?.balance) {
    cachedBossConfigById[bossId] = boss;
    return boss;
  }
  throw new Error(`Boss config not found: ${bossId}`);
}

export function getBossConfigById(bossId: string): BossConfigFile {
  const cached = cachedBossConfigById[bossId];
  if (cached) {
    return cached;
  }
  const levelMatch = playableLevelIds.find((levelId) => getLevelConfig(levelId).boss.id === bossId);
  if (levelMatch) {
    const balance = cachedPackagedBalanceByLevel[levelMatch];
    if (balance) {
      return {
        id: bossId,
        labelZh: bossId,
        labelEn: bossId,
        minionSpriteKeys: bossId === 'boss_octopus_02'
          ? ['bossOctopusJellyfishMinion']
          : ['ambientAlien01', 'ambientAlien02'],
        balance: balance.boss,
      };
    }
  }
  return {
    id: bossId,
    labelZh: bossId,
    labelEn: bossId,
    minionSpriteKeys: ['ambientAlien01', 'ambientAlien02'],
    balance: defaultBottleHeroBalance.boss,
  };
}

export function getBossConfig(levelId: LevelId = activeLevelId): BossConfigFile {
  return getBossConfigById(getLevelConfig(levelId).boss.id);
}

export async function loadPackagedBalanceConfig(bossId = 'boss_alien_01'): Promise<BottleHeroBalanceConfig> {
  const levelId = activeLevelId;
  const levelBossId = getLevelConfig(levelId).boss.id;
  if (bossId !== levelBossId) {
    const matchedLevel = playableLevelIds.find((id) => getLevelConfig(id).boss.id === bossId);
    if (matchedLevel) {
      return loadPackagedBalanceConfigForLevel(matchedLevel);
    }
  }
  return loadPackagedBalanceConfigForLevel(levelId);
}

export function getLevelConfig(levelId: LevelId = activeLevelId): LevelConfigFile {
  return cachedLevelConfigs[levelId] ?? cachedLevelConfigs.level_01 ?? {
    ...fallbackLevel01Config,
    throwItems: getLevelThrowItemPaths('level_01'),
  };
}

export function getActiveLevelConfig(): LevelConfigFile {
  return getLevelConfig(activeLevelId);
}

export function getLevel01Config(): LevelConfigFile {
  return getActiveLevelConfig();
}

export function getLevelRewards(levelId: LevelId = activeLevelId): LevelRewardsConfigFile {
  return cachedLevelRewards[levelId] ?? rewardsFallbacks[levelId] ?? fallbackLevel01Rewards;
}

export function getActiveLevelRewards(): LevelRewardsConfigFile {
  return getLevelRewards(activeLevelId);
}

export function getLevel01Rewards(): LevelRewardsConfigFile {
  return getActiveLevelRewards();
}

function mergeLevelConfig(levelId: LevelId, raw: LevelConfigFile): LevelConfigFile {
  const fallback = levelFallbacks[levelId];
  return {
    ...fallback,
    ...raw,
    id: levelId,
    backgrounds: { ...fallback.backgrounds, ...raw.backgrounds },
    boss: { ...fallback.boss, ...raw.boss },
    throwItems: raw.throwItems?.length ? raw.throwItems : getLevelThrowItemPaths(levelId),
  };
}

export async function loadLevelConfig(levelId: LevelId): Promise<LevelConfigFile> {
  try {
    const raw = await loadJsonResource<LevelConfigFile>(`bottlehero/config/levels/${levelId}`);
    cachedLevelConfigs[levelId] = mergeLevelConfig(levelId, raw);
  } catch (error) {
    console.warn(`BottleHero level config missing (${levelId}), using code fallback.`, error);
    cachedLevelConfigs[levelId] = {
      ...levelFallbacks[levelId],
      throwItems: getLevelThrowItemPaths(levelId),
    };
  }
  return getLevelConfig(levelId);
}

export async function loadLevel01Config(): Promise<LevelConfigFile> {
  return loadLevelConfig('level_01');
}

export async function loadLevelRewards(levelId: LevelId): Promise<LevelRewardsConfigFile> {
  try {
    const raw = await loadJsonResource<LevelRewardsConfigFile>(`bottlehero/config/rewards/${levelId}_rewards`);
    if (!Array.isArray(raw.goods) || !Number.isFinite(raw.victoryScoreBonus)) {
      throw new Error('Invalid level rewards config shape');
    }
    cachedLevelRewards[levelId] = {
      levelId: raw.levelId ?? levelId,
      bossId: raw.bossId ?? rewardsFallbacks[levelId].bossId,
      victoryScoreBonus: raw.victoryScoreBonus,
      goods: raw.goods,
    };
  } catch (error) {
    console.warn(`BottleHero level rewards config missing (${levelId}), using code fallback.`, error);
    cachedLevelRewards[levelId] = rewardsFallbacks[levelId];
  }
  return getLevelRewards(levelId);
}

export async function loadLevel01Rewards(): Promise<LevelRewardsConfigFile> {
  return loadLevelRewards('level_01');
}

export async function loadGameConfigs(): Promise<{
  balance: BottleHeroBalanceConfig;
  avatars: AvatarConfigFile;
  level01: LevelConfigFile;
  rewards: LevelRewardsConfigFile;
}> {
  const levelConfigs = await Promise.all(playableLevelIds.map((levelId) => loadLevelConfig(levelId)));
  await Promise.all(playableLevelIds.map((levelId) => loadLevelRewards(levelId)));
  await Promise.all(playableLevelIds.map((levelId) => loadPackagedBalanceConfigForLevel(levelId)));
  const level01 = levelConfigs[0];
  const balance = cachedPackagedBalanceByLevel[level01.id] ?? await loadPackagedBalanceConfigForLevel(level01.id);
  const avatars = await loadAvatarConfig();
  return {
    balance,
    avatars,
    level01,
    rewards: getLevelRewards('level_01'),
  };
}

export function getLevelBackgroundSpriteEntries(levelId: LevelId = activeLevelId): Array<[string, string, string]> {
  const backgrounds = getLevelConfig(levelId).backgrounds;
  const entries: Array<[string, string, string]> = [
    ['levelBackground', 'Level background', backgrounds.start],
    ['loopBackground', 'Loop background', backgrounds.loop],
    ['titleBackground', 'Title background', backgrounds.start],
    ['scene03BridgeBackground', 'Scene 03 bridge', backgrounds.scene03Bridge],
    ['scene03LoopBackground', 'Scene 03 loop', backgrounds.scene03Loop],
    ['scene04BridgeBackground', 'Scene 04 bridge', backgrounds.scene04Bridge],
    ['scene04LoopBackground', 'Scene 04 loop', backgrounds.scene04Loop],
  ];
  if (backgrounds.loopOnce) {
    entries.splice(1, 0, ['loopOnceBackground', 'Loop once background', backgrounds.loopOnce]);
  }
  return entries;
}
