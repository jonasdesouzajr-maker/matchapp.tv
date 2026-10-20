'use strict';
// Shared, idempotent presentation assets for existing and newly generated adult pages.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const {cinemaAssets}=require('./finalize-brand.js');

function applyAll(dir = ROOT) {
  let count = 0;
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    if (['.git','node_modules','android-studio','kids','private-voice','oauth','tests','artifacts','reports'].includes(item.name)) continue;
    const file = path.join(dir,item.name);
    if (item.isDirectory()) { count += applyAll(file); continue; }
    if (!item.name.endsWith('.html')) continue;
    const original = fs.readFileSync(file,'utf8'), updated = cinemaAssets(original,path.relative(ROOT,file));
    if (updated !== original) { fs.writeFileSync(file,updated); count++; }
  }
  return count;
}
module.exports = {cinemaAssets,applyAll};
if (require.main === module) console.log('Cinematic presentation installed on '+applyAll()+' adult pages.');
