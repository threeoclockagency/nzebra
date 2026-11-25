// Post-build link checker. Fails the build (exit 1) if any built page contains
// a dead href="#" or an internal link/asset that does not resolve to a file in
// dist/. External links (http/https/mailto/tel) are not fetched.
//
//   node scripts/check-links.mjs   (runs automatically after `npm run build`)
//
import { parse } from 'node-html-parser';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// Internal links must not point at a URL that only exists as a redirect source
// (that would make them hop through a 301). Load the sources from vercel.json.
let redirectSources = new Set();
try {
  const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  redirectSources = new Set((vercel.redirects || []).map((r) => r.source.replace(/\/+$/, '')));
} catch {
  /* no vercel.json */
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// An internal path resolves if it maps to a real file in dist.
function resolves(path) {
  const clean = decodeURIComponent(path.split('#')[0].split('?')[0]);
  if (clean === '' || clean === '/') return existsSync(join(DIST, 'index.html'));
  const base = join(DIST, clean);
  return (
    existsSync(base) ||
    existsSync(`${base}.html`) ||
    existsSync(join(base, 'index.html'))
  );
}

const problems = [];
for (const file of walk(DIST)) {
  const rel = file.replace(`${DIST}/`, '');
  const root = parse(readFileSync(file, 'utf8'));
  const nodes = [
    ...root.querySelectorAll('a[href]'),
    ...root.querySelectorAll('[src]'),
    ...root.querySelectorAll('link[href]'),
  ];
  // also check every candidate in srcset attributes
  const urls = [];
  for (const el of root.querySelectorAll('[srcset]')) {
    for (const part of (el.getAttribute('srcset') || '').split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.push(u);
    }
  }
  for (const el of nodes) urls.push(el.getAttribute('href') ?? el.getAttribute('src'));
  for (const url of urls) {
    if (!url) continue;
    if (url === '#') {
      problems.push(`${rel}: dead href="#"`);
    } else if (url.startsWith('/')) {
      const path = url.split('#')[0].split('?')[0].replace(/\/+$/, '');
      if (redirectSources.has(path)) {
        problems.push(`${rel}: internal link hits a 301 redirect -> ${url}`);
      } else if (!resolves(url)) {
        problems.push(`${rel}: broken internal link -> ${url}`);
      }
    }
    // http(s), mailto:, tel:, data:, #fragment are left alone
  }
}

if (problems.length) {
  console.error(`\n✗ Link check failed (${problems.length}):`);
  for (const p of [...new Set(problems)]) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✓ Link check passed: no dead "#" links and all internal links resolve.');
