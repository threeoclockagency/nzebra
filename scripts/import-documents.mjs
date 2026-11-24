// Import script: collect every PDF/Office document linked from the fixed pages
// (Resources + the 6 course modules) on the live site, download each into
// public/documents/ with a clean web-safe name, and write the old->new URL
// mapping to migracion/documentos-url-map.md for the migration report.
//
//   node scripts/import-documents.mjs
//
import { parse } from 'node-html-parser';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC_DIR = join(ROOT, 'public', 'documents');
const MAP_FILE = join(ROOT, 'migracion', 'documentos-url-map.md');
const SITE = 'https://nzebra.eu';
const UA = 'Mozilla/5.0 (migration import; nzebra.eu static migration)';
const DOC_EXT = /\.(pdf|docx?|pptx?|xlsx?)$/i;

// Fixed pages that link to documents (from the inventory).
const PAGES = [
  '/resources',
  '/course/circular-economy',
  '/course/climate-change-adaptation',
  '/course/energy-production',
  '/course/environmental-social-and-governmence-strategies',
  '/course/life-cycle-assessment-of-buildings',
  '/course/smart-buildings',
];

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function cleanName(url) {
  const raw = decodeURIComponent(url.split('/').pop().split('?')[0]);
  const noHash = raw.replace(/^[0-9a-f]{20,}_/i, ''); // strip Webflow hash prefix
  const ext = extname(noHash).toLowerCase();
  const base = noHash.slice(0, noHash.length - ext.length);
  const clean = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${clean || 'document'}${ext}`;
}

// --- collect links ------------------------------------------------------------
const docs = new Map(); // cdnUrl -> { name, refs: [{page, text}] }

for (const path of PAGES) {
  let html;
  try {
    html = await getText(SITE + path);
  } catch (e) {
    console.log(`! could not fetch ${path}: ${e.message}`);
    continue;
  }
  const root = parse(html);
  for (const a of root.querySelectorAll('a')) {
    const href = a.getAttribute('href') || '';
    if (!DOC_EXT.test(href.split('?')[0]) || !/^https?:\/\//.test(href)) continue;
    const text = a.text.trim().replace(/\s+/g, ' ') || '(no text)';
    if (!docs.has(href)) docs.set(href, { name: cleanName(href), refs: [] });
    docs.get(href).refs.push({ page: path, text });
  }
}

console.log(`Found ${docs.size} unique documents across ${PAGES.length} pages.\n`);

// --- guard against name collisions --------------------------------------------
const usedNames = new Map();
for (const [url, info] of docs) {
  let name = info.name;
  if (usedNames.has(name) && usedNames.get(name) !== url) {
    const ext = extname(name);
    let i = 2;
    while (usedNames.has(`${name.slice(0, -ext.length)}-${i}${ext}`)) i += 1;
    name = `${name.slice(0, -ext.length)}-${i}${ext}`;
    info.name = name;
  }
  usedNames.set(name, url);
}

// --- download -----------------------------------------------------------------
await mkdir(DOC_DIR, { recursive: true });
const rows = [];
let ok = 0;
const failures = [];

for (const [url, info] of docs) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(join(DOC_DIR, info.name), Buffer.from(await res.arrayBuffer()));
    ok += 1;
    console.log(`✓ ${info.name}`);
  } catch (e) {
    failures.push({ url, err: e.message });
    console.log(`✗ ${info.name} (${e.message})`);
  }
  rows.push({
    old: url,
    neu: `${SITE}/documents/${info.name}`,
    pages: [...new Set(info.refs.map((r) => r.page))].join(', '),
  });
}

// --- write the mapping file ---------------------------------------------------
const md = [
  '# Documentos: URL antigua -> URL nueva',
  '',
  'Las URLs antiguas (CDN de Webflow, `cdn.prod.website-files.com`) **no se pueden',
  'mantener ni redirigir**. Los archivos ahora se sirven desde nuestro hosting en',
  '`/documents/`. Lista generada por `scripts/import-documents.mjs`.',
  '',
  `Total: ${rows.length} documentos.`,
  '',
  '| # | URL antigua (Webflow CDN) | URL nueva (nzebra.eu) | Páginas |',
  '|---|---|---|---|',
  ...rows.map((r, i) => `| ${i + 1} | ${r.old} | ${r.neu} | ${r.pages} |`),
  '',
].join('\n');

await mkdir(dirname(MAP_FILE), { recursive: true });
await writeFile(MAP_FILE, md);

console.log(`\nDownloaded ${ok}/${docs.size}. Mapping -> migracion/documentos-url-map.md`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`• ${f.url} (${f.err})`);
}
