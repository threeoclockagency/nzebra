// Generate the default Open Graph image (1200x630) from the nZEBRA logo on the
// brand dark background with a mint accent bar. Output: public/images/og-default.png
//
//   node scripts/make-og.mjs
//
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200;
const H = 630;
const DARK = '#1a1b1f';
const MINT = '#75e6a2';

const logoBuf = await sharp(join(ROOT, 'public/images/nzebra-logo_logoH-colour-light.png'))
  .resize({ width: 640 })
  .toBuffer();
const { width: lw, height: lh } = await sharp(logoBuf).metadata();

const bg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="${DARK}"/>` +
    `<rect x="0" y="${H - 16}" width="${W}" height="16" fill="${MINT}"/>` +
    `</svg>`,
);

await sharp(bg)
  .composite([{ input: logoBuf, top: Math.round((H - lh) / 2), left: Math.round((W - lw) / 2) }])
  .png()
  .toFile(join(ROOT, 'public/images/og-default.png'));

console.log(`og-default.png written (${W}x${H}), logo ${lw}x${lh}`);
