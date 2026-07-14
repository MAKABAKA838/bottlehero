const fs = require('fs');
const path = require('path');

const mvpPath = path.join(__dirname, '../assets/scripts/bottlehero/BottleHeroMvp.ts');
let src = fs.readFileSync(mvpPath, 'utf8');
src = src.replace(/this\.sprites\.([a-zA-Z0-9_]+)/g, "this.assets.getSprite('$1')");
src = src.replace(/this\.sprites\[([^\]]+)\]/g, 'this.assets.getSprite($1)');
fs.writeFileSync(mvpPath, src);
console.log('Replaced sprite access in BottleHeroMvp.ts');
