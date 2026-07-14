/** Shared throw item filenames for Level 01 default set (27 items). */
const THROW_ITEM_FILES = [
  'throw_item_00_kettle.png',
  'throw_item_01_toy.png',
  'throw_item_02_toy.png',
  'throw_item_03_car.png',
  'throw_item_04_car.png',
  'throw_item_05_car.png',
  'throw_item_06_car.png',
  'throw_item_07_car.png',
  'throw_item_08_car.png',
  'throw_item_09_tv.png',
  'throw_item_10_tv.png',
  'throw_item_11_tire.png',
  'throw_item_12_tire.png',
  'throw_item_13_rocket_01.png',
  'throw_item_14_rocket_02.png',
  'throw_item_15_rocket_03.png',
  'throw_item_16_rocket_04.png',
  'throw_item_17_ship_01.png',
  'throw_item_18_ship_02.png',
  'throw_item_19_satellite_01.png',
  'throw_item_20_satellite_02.png',
  'throw_item_21_satellite_03.png',
  'throw_item_22_satellite_04.png',
  'throw_item_23_satellite_05.png',
  'throw_item_24_satellite_06.png',
  'throw_item_25_satellite_07.png',
  'throw_item_26_satellite_08.png',
];

const LEVEL_02_THROW_ITEM_FILES = Array.from({ length: 20 }, (_, index) => `throw_item_${String(index).padStart(2, '0')}.png`);

function levelThrowItemPaths(levelFolder) {
  const files = levelFolder === 'level_02' ? LEVEL_02_THROW_ITEM_FILES : THROW_ITEM_FILES;
  return files.map((file) => `gameplay/throw-items/${levelFolder}/${file}`);
}

module.exports = {
  THROW_ITEM_FILES,
  LEVEL_02_THROW_ITEM_FILES,
  levelThrowItemPaths,
  level01ThrowItemPaths: levelThrowItemPaths('level_01'),
  level02ThrowItemPaths: levelThrowItemPaths('level_02'),
  level03ThrowItemPaths: levelThrowItemPaths('level_03'),
};
