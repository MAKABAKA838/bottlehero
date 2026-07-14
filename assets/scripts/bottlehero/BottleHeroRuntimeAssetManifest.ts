import { BottleHeroAssets, bottleHeroWebPaths } from './BottleHeroAssets';
import { getBossBattleSheetAssetsForConfigBoss } from './BottleHeroBossAssets';
import { getLevelBackgroundSpriteEntries, getLevelConfig } from './BottleHeroConfigLoader';
import { getLevelAmbientSpriteEntries, playableBossIds, playableLevelIds, type LevelId } from './BottleHeroGameConfig';
import type { CoreAudioClipKey } from './BottleHeroTypes';

export type SpriteLoadEntry = [spriteKey: string, label: string, webPath: string];

/** Title / avatar 首屏共用贴图（不含关卡背景与 ambient）。 */
export function getSharedRuntimeSpriteLoadEntries(): SpriteLoadEntry[] {
  return [
    ['logo', 'Logo', 'ui/logo.png'],
    ['buttonNormal', 'Start button', 'ui/buttons/start_normal.png'],
    ['buttonPressed', 'Pressed button', 'ui/buttons/start_pressed.png'],
    ['enterButton', 'Enter button', 'ui/buttons/enter_button.png'],
    ['continueButton', 'Continue button', 'ui/buttons/continue_button.png'],
    ['quitButton', 'Quit button', 'ui/buttons/quit_button.png'],
    ['avatarRoomBackground', 'Avatar room background', 'avatar/backgrounds/avatar_pet_room_background.jpg'],
    ['avatarCat01', 'Avatar cat 01', 'avatar/cats/player_avatar_cat_01.png'],
    ['avatarCat01Icon', 'Avatar cat 01 icon', 'avatar/cats/player_avatar_cat_01_icon.png'],
    ['avatarCat02', 'Avatar cat 02', 'avatar/cats/player_avatar_cat_02.png'],
    ['avatarCat02Icon', 'Avatar cat 02 icon', 'avatar/cats/player_avatar_cat_02_icon.png'],
    ['avatarCat03', 'Avatar cat 03', 'avatar/cats/player_avatar_cat_03.png'],
    ['avatarCat03Icon', 'Avatar cat 03 icon', 'avatar/cats/player_avatar_cat_03_icon.png'],
    ['avatarCat04', 'Avatar cat 04', 'avatar/cats/player_avatar_cat_04.png'],
    ['avatarCat04Icon', 'Avatar cat 04 icon', 'avatar/cats/player_avatar_cat_04_icon.png'],
    ['avatarPreviousButton', 'Avatar previous button', 'ui/buttons/avatar_previous.png'],
    ['avatarNextButton', 'Avatar next button', 'ui/buttons/avatar_next.png'],
    ['playGameButton', 'Avatar play game button', 'ui/buttons/play_game.png'],
    ['feedbackButton', 'Avatar feedback button', 'ui/buttons/feedback.png'],
    ['rankingButton', 'Avatar ranking button', 'ui/buttons/ranking.png'],
    ['levelButton', 'Avatar level button', 'ui/buttons/level.png'],
    ['goodsButton', 'Avatar goods button', 'ui/buttons/goods.png'],
    ['avatarGoodsPanel', 'Avatar goods panel', 'avatar/panels/avatar_goods_panel.png'],
    ['avatarLevelPanel', 'Avatar level panel', 'avatar/panels/avatar_level_panel.png'],
    ['avatarRankingPanel', 'Avatar ranking panel', 'avatar/panels/avatar_ranking_panel.png'],
    ['rankingPanel', 'Ranking panel', 'avatar/panels/ranking_panel.png'],
    ['level1Button', 'Level 1 button', 'ui/buttons/level_1.png'],
    ['level2Button', 'Level 2 button', 'ui/buttons/level_2.png'],
    ['level3Button', 'Level 3 button', 'ui/buttons/level_3.png'],
    ['levelLockedButton', 'Level locked button', 'ui/buttons/level_locked.png'],
    ['panelCloseButton', 'Panel close button', 'ui/buttons/panel_close.png'],
    ['avatarGoods01', 'Avatar goods 01', 'avatar/goods/avatar_goods_01.png'],
    ['avatarGoods02', 'Avatar goods 02', 'avatar/goods/avatar_goods_02.png'],
    ['avatarGoods03', 'Avatar goods 03', 'avatar/goods/avatar_goods_03.png'],
    ['avatarGoodsHelmet', 'Avatar goods helmet', 'avatar/goods/avatar_goods_Helmet.png'],
    ['avatarGoodsArmor', 'Avatar goods armor', 'avatar/goods/avatar_goods_armor.png'],
    ['avatarGoodsBoots', 'Avatar goods boots', 'avatar/goods/avatar_goods_boots.png'],
    ['rankingNo1Icon', 'Ranking no 1 icon', 'avatar/ranking/ranking_no_1_icon.png'],
    ['rankingNo2Icon', 'Ranking no 2 icon', 'avatar/ranking/ranking_no_2_icon.png'],
    ['rankingNo3Icon', 'Ranking no 3 icon', 'avatar/ranking/ranking_no_3_icon.png'],
    ['rankingUserIcon', 'Ranking user icon', 'avatar/ranking/user_01_icon.png'],
    ['clawLeftButton', 'Left hand button', 'ui/buttons/hand_left.png'],
    ['clawRightButton', 'Right hand button', 'ui/buttons/hand_right.png'],
    ['scorePanel', 'Score panel', 'ui/hud/score_panel.png'],
    ['gameOverPanel', 'Game over panel', 'ui/hud/gameover_panel.png'],
    ['timingBar', 'Timing bar', 'timing/timing_bar_line.png'],
    ['timingBarCircle', 'Timing circle bar', 'timing/timing_bar_circle.png'],
    ['timingBarTriangle', 'Timing triangle bar', 'timing/timing_bar_triangle.png'],
    ['timingBarPath', 'Timing path bar', 'timing/timing_bar_path.png'],
    ['timingBarStar', 'Timing star bar', 'timing/timing_bar_star.png'],
    ['timingBarInfinity', 'Timing infinity bar', 'timing/timing_bar_Infinity symbol.png'],
    ['timingHandle', 'Timing handle', 'timing/timing_handle.png'],
    ['timingPoint', 'Timing point', 'timing/timing_point.png'],
    ['timingPointNormal', 'Timing point normal', 'timing/timing_point_normal.png'],
    ['timingPointGood', 'Timing point good', 'timing/timing_point_good.png'],
    ['timingPointRare', 'Timing point rare', 'timing/timing_point_rare.png'],
    ['timingPointTreasure', 'Timing point treasure', 'timing/timing_point_treasure.png'],
    ['timingItemStability', 'Timing stability item', 'timing/timing_item_stability.png'],
    ['timingItemMultiply', 'Timing multiply item', 'timing/timing_item_multiply.png'],
    ['timingItemBomb', 'Timing bomb item', 'timing/timing_item_bomb.png'],
    ['timingItemFood', 'Timing food item', 'timing/timing_item_food.png'],
    ['timingItemComboAttack', 'Timing combo skill item', 'timing/timing_item_combo_attack.png'],
    ['timingItemFrozenSkill', 'Timing frozen skill item', 'timing/timing_item_frozen_skill.png'],
    ['timingHighlightNormal', 'Timing highlight normal', 'timing/timing_highlight_normal.png'],
    ['timingHighlightDanger', 'Timing highlight danger', 'timing/timing_highlight_danger.png'],
    ['bossWarning', 'Boss warning', 'boss/boss_show_up_warning.png'],
    ['bossBullet', 'Boss bullet', 'boss/boss_alien_bullet.png'],
    ['bossHpFill', 'Boss HP fill', 'boss/boss_hp_fill.png'],
    ['bossHpBar', 'Boss HP bar', 'boss/boss_hp_bar.png'],
    ['bossHpText', 'Boss HP text', 'boss/boss_hp_text.png'],
    ['rewardIconPanel', 'Reward icon panel', 'ui/reward/reward_panel.png'],
    ['rewardIcon', 'Reward icon', 'ui/reward/reward_chest.png'],
    ['buttonGet', 'Get button', 'ui/buttons/get_button.png'],
    ['bossComboTip01', 'Boss combo tap tip 01', 'boss/combo_tip_01.png'],
    ['bossComboTip02', 'Boss combo tap tip 02', 'boss/combo_tip_02.png'],
    ['comboBar', 'Combo bar', 'ui/hud/combo_bar.png'],
    ['leftsideScoreIcon', 'Left score icon', 'ui/hud/score_icon.png'],
    ['pauseButton', 'Pause button', 'ui/buttons/pause.png'],
    ['stabilityBar', 'Stability bar', 'ui/hud/stability_bar.png'],
    ['stabilityState', 'Stability fill', 'ui/hud/stability_state.png'],
    ['playerArm', 'Player paw', 'player/paw_right.png'],
    ['playerArmCat04', 'Player paw (cat 04)', 'player/cat_04_arm_r.png'],
    ['catNpc', 'Cat helper', 'player/cat_helper.png'],
  ];
}

/** 单关背景 + ambient（开局 `beginRun` / 分包预取时按关卡加载）。 */
export function getLevelRuntimeSpriteLoadEntries(levelId: LevelId): SpriteLoadEntry[] {
  return [
    ...getLevelBackgroundSpriteEntries(levelId),
    ...getLevelAmbientSpriteEntries(levelId),
  ];
}

/** 首屏 boot：共用 UI（关卡背景 / ambient / 投掷 / Boss 图集均在 `loadAll` 一次性预载）。 */
export function getBootRuntimeSpriteLoadEntries(): SpriteLoadEntry[] {
  return getSharedRuntimeSpriteLoadEntries();
}

/**
 * 完整关卡贴图清单 = 共用 UI + 该关背景/ambient。
 * @deprecated 首屏请用 `getBootRuntimeSpriteLoadEntries`；按关用 `getLevelRuntimeSpriteLoadEntries`。
 */
export function getRuntimeSpriteLoadEntries(levelId: LevelId = 'level_01'): SpriteLoadEntry[] {
  return [
    ...getSharedRuntimeSpriteLoadEntries(),
    ...getLevelRuntimeSpriteLoadEntries(levelId),
  ];
}

export const coreAudioLoadEntries: Array<[CoreAudioClipKey, string, string]> = [
  ['bgm', 'BGM', BottleHeroAssets.audio.bgm],
  ['throw', 'Throw sound', BottleHeroAssets.audio.throw],
  ['perfect', 'Perfect sound', BottleHeroAssets.audio.perfect],
  ['good', 'Good sound', BottleHeroAssets.audio.good],
  ['miss', 'Miss sound', BottleHeroAssets.audio.miss],
];

export const coreAudioResourcePaths: Array<[CoreAudioClipKey, string]> = coreAudioLoadEntries.map(
  ([key, , path]) => [key, path],
);

/** 加载进度条用：后台 SFX / 连击数字贴图数量（与 `BottleHeroRuntimeAssetStore` 一致）。 */
export const runtimeSfxLoadCount = bottleHeroWebPaths.sfx.length;
export const runtimeComboDigitLoadCount = bottleHeroWebPaths.comboDigits.length;

export function getPlayableLevelBackgroundLoadCount(): number {
  return playableLevelIds.reduce(
    (sum, levelId) => sum + getLevelBackgroundSpriteEntries(levelId).length,
    0,
  );
}

export function getPlayableLevelAmbientLoadCount(): number {
  return playableLevelIds.reduce(
    (sum, levelId) => sum + getLevelAmbientSpriteEntries(levelId).length,
    0,
  );
}

export function getPlayableLevelThrowItemLoadCount(): number {
  return playableLevelIds.reduce(
    (sum, levelId) => sum + getLevelConfig(levelId).throwItems.length,
    0,
  );
}

export function getPlayableBossSheetLoadCount(): number {
  const seen = new Set<string>();
  let count = 0;
  for (const bossId of playableBossIds) {
    for (const asset of getBossBattleSheetAssetsForConfigBoss(bossId)) {
      if (seen.has(asset.id)) {
        continue;
      }
      seen.add(asset.id);
      count += 1;
    }
  }
  return count;
}

/** Loading 屏总步数（与 `BottleHeroRuntimeAssetStore.loadAll` 一致）。 */
export function getFullBootLoadStepCount(): number {
  return getBootRuntimeSpriteLoadEntries().length
    + getPlayableLevelBackgroundLoadCount()
    + getPlayableLevelAmbientLoadCount()
    + getPlayableLevelThrowItemLoadCount()
    + getPlayableBossSheetLoadCount()
    + 1
    + runtimeComboDigitLoadCount
    + coreAudioLoadEntries.length
    + runtimeSfxLoadCount
    + 3;
}
