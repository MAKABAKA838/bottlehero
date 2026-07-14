/** Shared ambient sprite filenames (6 per level folder). */
const AMBIENT_FILES = [
  'bee.png',
  'bird_01.png',
  'bird_02.png',
  'alien_01.png',
  'alien_02.png',
  'alien_03.png',
];

const AMBIENT_SPRITE_KEYS = [
  'ambientBee',
  'ambientBird01',
  'ambientBird02',
  'ambientAlien01',
  'ambientAlien02',
  'ambientAlien03',
];

function levelAmbientPath(levelFolder, file) {
  return `ambient/${levelFolder}/${file}`;
}

function levelAmbientSpriteEntries(levelFolder) {
  return AMBIENT_FILES.map((file, index) => [AMBIENT_SPRITE_KEYS[index], file]);
}

module.exports = {
  AMBIENT_FILES,
  AMBIENT_SPRITE_KEYS,
  levelAmbientPath,
  levelAmbientSpriteEntries,
};
