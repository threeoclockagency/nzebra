// Port the fixed Webflow pages and course modules into Astro pages, preserving
// the design (classes kept) while stripping everything we are replacing:
//   - <script>, embedded <style>, the Brevo newsletter <section>, the footer
//   - the Webflow navbar (replaced by our <Header /> component)
//   - inline style="" attributes and Webflow IX2 data-* hooks (no inline CSS)
// and rewriting asset paths to our own hosting:
//   - images/… -> /images/…
//   - (../)documents/NAME -> /documents/<clean-name>  (matches import-documents)
//
//   node scripts/port-pages.mjs
//
import { parse } from 'node-html-parser';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modules } from '../src/data/modules.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT = join(ROOT, 'migracion', 'webflow-export');
const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));

// nZEBRA course cards: relabel with unified titles and reorder 1..6.
function applyModuleCards(body) {
  const grid = body.querySelector('.kc-grid-wrap');
  if (!grid) return;
  const ranked = grid.querySelectorAll('.kc-info-wrap').map((card) => {
    const slug = card.querySelector('a[href^="/course/"]')?.getAttribute('href')?.replace('/course/', '');
    const mod = moduleBySlug.get(slug);
    if (mod) card.querySelector('h3')?.set_content(mod.title);
    return { card, number: mod ? mod.number : 99 };
  });
  ranked.sort((a, b) => a.number - b.number);
  for (const { card } of ranked) card.remove();
  for (const { card } of ranked) grid.appendChild(card);
}

// Resources list: label the WP3 course-content PDFs "Module N – <unified title>".
function applyResourceModuleLabels(body) {
  for (const a of body.querySelectorAll('a[href*="WP3-Course-content-development-module-"]')) {
    const m = a.getAttribute('href').match(/module-(\d(?:-\d)?)\.pdf$/i);
    if (!m) continue;
    const num = m[1] === '1-6' ? 1 : parseInt(m[1], 10);
    const mod = modules.find((x) => x.number === num);
    if (mod) a.set_content(`Module ${num} – ${mod.title}`);
  }
}

// Clean document filename exactly like scripts/import-documents.mjs so links
// resolve to the files already downloaded into public/documents/.
function fixDocTypos(s) {
  return s.replace(/Callenge/g, 'Challenge').replace(/Infrestructure/g, 'Infrastructure');
}
function cleanDoc(name) {
  const decoded = decodeURIComponent(name).replace(/^[0-9a-f]{20,}_/i, '');
  const ext = extname(decoded).toLowerCase();
  const base = decoded.slice(0, decoded.length - ext.length);
  const clean = fixDocTypos(base)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${clean || 'document'}${ext}`;
}

// Social icons the pages load from the Webflow CDN -> our self-hosted copies.
const REMOTE_IMG = [
  ['twitter%20big.svg', '/images/social-x.svg'],
  ['twitter big.svg', '/images/social-x.svg'],
  ['youtube%20small.svg', '/images/social-youtube.svg'],
  ['youtube small.svg', '/images/social-youtube.svg'],
  ['facebook%20big%20filled.svg', '/images/social-facebook.svg'],
  ['facebook big filled.svg', '/images/social-facebook.svg'],
];

const DROP_ATTRS = [
  'style', 'data-w-id', 'data-animation', 'data-duration', 'data-easing',
  'data-easing2', 'data-collapse', 'data-wf-page-id', 'data-wf-element-id',
  'data-wf-page', 'data-wf-site',
];

// Text typo corrections (point 8) applied to visible text of ported pages.
const TYPOS = [
  [/green house/g, 'greenhouse'],
  [/Green house/g, 'Greenhouse'],
  [/Advance energy/g, 'Advanced energy'],
  [/governmence/g, 'governance'],
  [/Governmence/g, 'Governance'],
  // Past tense — the project ended in August 2026 (point 8). ESG wording on the
  // course page is intentionally left untouched.
  [/aims to develop a robust/g, 'developed a robust'],
  [/programme will cover/g, 'programme covers'],
  [/we aim to equip/g, 'we equipped'],
  [/project will develop an intensive/g, 'project developed an intensive'],
  [/main objective include:/g, 'main objective included:'],
];
function applyTypos(s) {
  let out = s;
  for (const [re, to] of TYPOS) out = out.replace(re, to);
  return out;
}

// The old ESG module URL now points at the Indoor climate module (new slug).
const OLD_MODULE_SLUG = 'environmental-social-and-governmence-strategies';
const NEW_MODULE_SLUG = 'indoor-climate-heating-cooling-ventilation';
function fixSlug(slug) {
  return slug === OLD_MODULE_SLUG ? NEW_MODULE_SLUG : slug;
}

function cleanTree(node) {
  const el = node;
  if (el.nodeType === 3) {
    const fixed = applyTypos(el.rawText);
    if (fixed !== el.rawText) el.rawText = fixed;
    return;
  }
  if (el.nodeType === 1) {
    for (const a of DROP_ATTRS) el.removeAttribute?.(a);

    // rewrite image sources
    for (const attr of ['src', 'srcset']) {
      let v = el.getAttribute?.(attr);
      if (!v) continue;
      if (v.includes('images/')) v = v.replace(/(\.\.\/)?images\//g, '/images/');
      for (const [needle, local] of REMOTE_IMG) if (v.includes(needle)) v = local;
      el.setAttribute(attr, v);
    }
    // rewrite links
    const href = el.getAttribute?.('href');
    if (href) {
      let h = href;
      const stripped = h.replace(/^(?:\.\.?\/)+/, '');
      const mDoc = stripped.match(/^documents\/(.+)$/);
      const mCourse = stripped.match(/^course\/([a-z0-9-]+)\.html$/i);
      const mPage = stripped.match(/^([a-z0-9-]+)\.html$/i);
      if (mDoc) {
        h = `/documents/${cleanDoc(mDoc[1])}`;
      } else if (mCourse) {
        h = `/course/${fixSlug(mCourse[1])}`;
      } else if (mPage) {
        h = mPage[1] === 'index' ? '/' : `/${mPage[1]}`;
      } else if (/^https?:\/\/(www\.)?nzebra\.eu\//i.test(h)) {
        // internal absolute link -> relative, remapping the old ESG module URL
        h = h
          .replace(/^https?:\/\/(www\.)?nzebra\.eu/i, '')
          .replace(`/course/${OLD_MODULE_SLUG}`, `/course/${NEW_MODULE_SLUG}`);
      }
      if (h !== href) el.setAttribute('href', h);
    }

    // harden links that open in a new tab
    if (el.rawTagName === 'a' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
  for (const c of el.childNodes || []) cleanTree(c);
}

function port({ src, out, variant, title, description, stripClasses = [], moduleTitle }) {
  const root = parse(readFileSync(join(EXPORT, src), 'utf8'));
  const body = root.querySelector('body');

  // remove scripts, embedded styles, newsletter, footer, forms
  for (const sel of ['script', 'style', 'form', 'section.newsletter', '.footer']) {
    body.querySelectorAll(sel).forEach((n) => n.remove());
  }
  for (const cls of stripClasses) body.querySelectorAll(cls).forEach((n) => n.remove());

  // remove dead placeholder links (href="#"): drop icon-only ones, unwrap text ones
  body.querySelectorAll('a').forEach((a) => {
    if (a.getAttribute('href') === '#') {
      if (a.text.trim() === '') a.remove();
      else a.replaceWith(a.innerHTML);
    }
  });

  // remove leftover "TBA" placeholders (point 2) — after #-links are unwrapped
  body.querySelectorAll('h1,h2,h3,h4,p,span,div,li').forEach((el) => {
    const hasChildEl = el.childNodes.some((n) => n.nodeType === 1);
    if (!hasChildEl && el.text.trim() === 'TBA') el.remove();
  });

  // replace the Webflow navbar with a placeholder for <Header />
  const navbar = body.querySelector('.navbar-dark-bg, .navbar-light-bg');
  if (navbar) navbar.replaceWith('@@HEADER@@');

  cleanTree(body);

  // module-name unification (point 2): page-specific transforms
  if (moduleTitle) body.querySelector('h1')?.set_content(moduleTitle);
  if (src === 'nzebra-course.html') applyModuleCards(body);
  if (src === 'resources.html') applyResourceModuleLabels(body);

  let html = body.innerHTML.trim();
  // neutralise characters Astro would read as template syntax
  html = html.replace(/[{}]/g, (c) => (c === '{' ? '&#123;' : '&#125;'));
  html = html.replace('@@HEADER@@', `<Header variant="${variant}" />`);

  // depth under src/pages/ decides how many ../ the imports need
  const depth = out.replace(/^src\/pages\//, '').split('/').length - 1;
  const up = '../'.repeat(depth + 1);
  const file =
    '---\n' +
    `import BaseLayout from '${up}layouts/BaseLayout.astro';\n` +
    `import Header from '${up}components/Header.astro';\n` +
    '---\n\n' +
    `<BaseLayout title=${JSON.stringify(title)} description=${JSON.stringify(description)}>\n` +
    html +
    '\n</BaseLayout>\n';

  const outPath = join(ROOT, out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, file);
  console.log(`✓ ${out}`);
}

// --- fixed pages --------------------------------------------------------------
port({
  src: 'about-us.html',
  out: 'src/pages/about-us.astro',
  variant: 'dark',
  title: 'About us',
  description:
    'Meet the nZEBRA consortium and see how the project built a blended course training professionals to design climate-neutral buildings.',
});
port({
  src: 'nzebra-course.html',
  out: 'src/pages/nzebra-course.astro',
  variant: 'light',
  title: 'nZEBRA course',
  description:
    'Explore the six micro-credential modules of the nZEBRA course, from climate resilience to smart buildings and life cycle assessment.',
});
port({
  src: 'resources.html',
  out: 'src/pages/resources.astro',
  variant: 'dark',
  title: 'Resources',
  description:
    "Download nZEBRA's deliverables, course materials, booklets and dissemination outputs on climate-neutral and nearly zero-energy buildings.",
  stripClasses: ['.text-regular.cc-white'], // stray floating element after the footer
});
// contact.astro is hand-authored (form removed, custom contact block) — not ported here.

// --- course modules -----------------------------------------------------------
// src = export filename, out = URL slug (titles come from src/data/modules.ts).
const MODULES = [
  { src: 'circular-economy', out: 'circular-economy' },
  { src: 'climate-change-adaptation', out: 'climate-change-adaptation' },
  { src: 'energy-production', out: 'energy-production' },
  { src: 'environmental-social-and-governmence-strategies', out: 'indoor-climate-heating-cooling-ventilation' },
  { src: 'life-cycle-assessment-of-buildings', out: 'life-cycle-assessment-of-buildings' },
  { src: 'smart-buildings', out: 'smart-buildings' },
];

for (const m of MODULES) {
  const mod = moduleBySlug.get(m.out);
  port({
    src: `course/${m.src}.html`,
    out: `src/pages/course/${m.out}.astro`,
    variant: 'dark',
    title: mod.title,
    moduleTitle: mod.title,
    description: mod.description,
  });
}

console.log('\nDone. Remember: privacy-policy is rewritten by hand (GA/Brevo removed).');
