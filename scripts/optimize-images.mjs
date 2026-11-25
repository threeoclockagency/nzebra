// Convert raster images in public/images to WebP (<=1600px wide, <=250 KB),
// deleting the originals. SVGs, favicons and the OG image are left untouched.
// News images are already optimised on download by import-news.mjs; this script
// is idempotent (it skips files that are already .webp).
//
//   node scripts/optimize-images.mjs
//
import { readdirSync, statSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'images');
const KEEP = new Set(['og-default.png', 'favicon.png', 'webclip.png']);
const MAX = 250 * 1024;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function toWebp(buf) {
  for (const [width, quality] of [[1600, 80], [1600, 65], [1280, 60], [1024, 55]]) {
    const out = await sharp(buf).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
    if (out.length <= MAX) return out;
    if (quality === 55) return out; // give up tightening; still smaller than original
  }
}

let converted = 0;
let before = 0;
let after = 0;
let worst = 0;
for (const file of walk(DIR)) {
  const ext = extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
  if (KEEP.has(file.split('/').pop())) continue;

  const buf = readFileSync(file);
  const webp = await toWebp(buf);
  const target = file.slice(0, file.length - ext.length) + '.webp';
  writeFileSync(target, webp);
  if (target !== file) rmSync(file);
  converted += 1;
  before += buf.length;
  after += webp.length;
  worst = Math.max(worst, webp.length);
}

console.log(
  `Converted ${converted} images to WebP. ${(before / 1048576).toFixed(1)} MB -> ` +
    `${(after / 1048576).toFixed(1)} MB. Largest output: ${(worst / 1024).toFixed(0)} KB.`,
);
