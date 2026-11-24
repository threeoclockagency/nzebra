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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT = join(ROOT, 'migracion', 'webflow-export');

// Clean document filename exactly like scripts/import-documents.mjs so links
// resolve to the files already downloaded into public/documents/.
function cleanDoc(name) {
  const decoded = decodeURIComponent(name).replace(/^[0-9a-f]{20,}_/i, '');
  const ext = extname(decoded).toLowerCase();
  const base = decoded.slice(0, decoded.length - ext.length);
  const clean = base.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

function cleanTree(node) {
  const el = node;
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
    // rewrite document links
    const href = el.getAttribute?.('href');
    if (href) {
      const m = href.match(/^(?:\.\.\/)?documents\/(.+)$/);
      if (m) el.setAttribute('href', `/documents/${cleanDoc(m[1])}`);
    }
  }
  for (const c of el.childNodes || []) cleanTree(c);
}

function port({ src, out, variant, title, description, stripClasses = [] }) {
  const root = parse(readFileSync(join(EXPORT, src), 'utf8'));
  const body = root.querySelector('body');

  // remove scripts, embedded styles, newsletter, footer, forms
  for (const sel of ['script', 'style', 'form', 'section.newsletter', '.footer']) {
    body.querySelectorAll(sel).forEach((n) => n.remove());
  }
  for (const cls of stripClasses) body.querySelectorAll(cls).forEach((n) => n.remove());

  // replace the Webflow navbar with a placeholder for <Header />
  const navbar = body.querySelector('.navbar-dark-bg, .navbar-light-bg');
  if (navbar) navbar.replaceWith('@@HEADER@@');

  cleanTree(body);

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
  title: 'About us — nZEBRA',
  description:
    'About the nZEBRA Erasmus+ project: our mission, our solution and the partner consortium behind the intensive blended course on climate-neutral buildings.',
});
port({
  src: 'nzebra-course.html',
  out: 'src/pages/nzebra-course.astro',
  variant: 'light',
  title: 'nZEBRA course — nZEBRA',
  description:
    'The nZEBRA intensive blended course on climate-neutral buildings, built on micro-credentials across six interdisciplinary modules.',
});
port({
  src: 'resources.html',
  out: 'src/pages/resources.astro',
  variant: 'dark',
  title: 'Resources — nZEBRA',
  description:
    'Downloadable resources and project deliverables from the nZEBRA project: course materials, reports, booklets and dissemination documents.',
  stripClasses: ['.text-regular.cc-white'], // stray floating element after the footer
});
port({
  src: 'contact.html',
  out: 'src/pages/contact.astro',
  variant: 'light',
  title: 'Contact — nZEBRA',
  description: 'Get in touch with the nZEBRA project consortium.',
});

// --- course modules -----------------------------------------------------------
const MODULES = [
  { slug: 'circular-economy', title: 'Circular economy' },
  { slug: 'climate-change-adaptation', title: 'Climate change adaptation' },
  { slug: 'energy-production', title: 'Energy production' },
  {
    slug: 'environmental-social-and-governmence-strategies',
    out: 'environmental-social-and-governance-strategies', // typo corrected in the URL
    title: 'Environmental, social and governance strategies',
  },
  { slug: 'life-cycle-assessment-of-buildings', title: 'Life cycle assessment of buildings' },
  { slug: 'smart-buildings', title: 'Smart buildings' },
];

for (const m of MODULES) {
  port({
    src: `course/${m.slug}.html`,
    out: `src/pages/course/${m.out ?? m.slug}.astro`,
    variant: 'dark',
    title: `${m.title} — nZEBRA course`,
    description: `${m.title}: part of the nZEBRA intensive blended course on climate-neutral buildings.`,
  });
}

console.log('\nDone. Remember: privacy-policy is rewritten by hand (GA/Brevo removed).');
