// Import script: pull the ~19 News & Events articles from the live Webflow site
// (no CSV was available) and write one Markdown file per article into
// src/content/news/, downloading each article's images into
// public/images/news/<slug>/ so everything is served from our own hosting.
//
//   node scripts/import-news.mjs
//
// The HTML body is converted to Markdown through a strict tag whitelist, so no
// raw HTML survives into the content files.
//
import { parse } from 'node-html-parser';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'src', 'content', 'news');
const IMG_ROOT = join(ROOT, 'public', 'images', 'news');
const DOC_ROOT = join(ROOT, 'public', 'documents', 'news');
const SITE = 'https://nzebra.eu';
const UA = 'Mozilla/5.0 (migration import; nzebra.eu static migration)';

// Links in article bodies that point at Webflow-hosted assets must be pulled
// into the repo; Brevo links and broken local file:// links must be dropped.
const WEBFLOW_HOST = /(website-files\.com|uploads-ssl\.webflow\.com|assets\.website-files\.com)/i;
const BREVO_HOST = /sibforms\.com|sendinblue|brevo/i;

// Approved SEO meta descriptions (<=155 chars), written from each article's
// first paragraph. `description` (the Webflow excerpt) stays as the listing summary.
const META = {
  'a-greener-horizon-the-strengthened-energy-performance-of-buildings-directive':
    "How the EU's revised Energy Performance of Buildings Directive, part of the Green Deal, moves member states toward climate-neutral buildings.",
  'different-eu-approach-to-nzeb-in-the-eu-member-states':
    'Buildings drive 40% of EU energy use and 36% of CO2 emissions: how member states define and apply nearly zero-energy building standards.',
  'dive-into-nzeb-and-zeb-concepts-at-the-nzebra-summer-school-2025':
    'Marking International Education Day, nZEBRA explains the nZEB and ZEB concepts explored at its 2025 Summer School on climate-neutral buildings.',
  'empowering-future-professionals-with-nzeb-skills':
    'The nZEBRA project kicked off in Halmstad, Sweden, as partners met to shape a blended course giving students practical nZEB design skills.',
  'energy-and-sustainability-why-is-energy-efficiency-important-and-what-is-the-link-to-sustainability':
    'Why energy efficiency matters: the building sector drives 39% of global carbon emissions, making it central to sustainability and climate action.',
  'enhancing-energy-management-skills':
    "HEP-ESCO's Energy Managers Course trained 15 specialists from five major energy companies in systematic energy management and efficiency.",
  'final-stakeholder-meeting-highlights-the-future-of-climate-neutral-buildings':
    'At the final nZEBRA event, experts from academia, industry and policy discussed the future of energy-efficient, climate-neutral buildings.',
  'hep-esco-hosts-stakeholder-meeting-for-the-nzebra-project-in-zagreb':
    'HEP ESCO hosted a nZEBRA stakeholder meeting in Zagreb, advancing sustainable construction and climate-neutral buildings across Europe.',
  'nzebra-final-stakeholder-meeting-registraion-is-open':
    "Registration is open for nZEBRA's final hybrid stakeholder meeting, closing the project alongside the Master's course activities.",
  'nzebra-final-summer-school-turning-knowledge-into-practice':
    "The final nZEBRA Summer School at Halmstad University turns years of collaboration into practice and concludes the project's activities.",
  'nzebra-general-assembly-in-hamburg-key-takeaways-and-exciting-plans-ahead':
    "nZEBRA partners met in Hamburg at TUHH for a General Assembly, reviewing progress and planning the project's next steps.",
  'nzebra-project-concludes-three-years-of-collaboration-for-climate-neutral-building-education':
    'After three years, the nZEBRA project concludes, leaving educational resources and a blended training programme for climate-neutral buildings.',
  'reflections-from-the-nzebra-summer-school-in-hamburg':
    "Reflections on nZEBRA's Summer School in Hamburg, where master's students from across Europe trained in climate-neutral buildings and simulation.",
  'resilience-pathways-for-climate-extremes-key-to-urban-energy-transition-and-climate-change-adaptation':
    'How cities can build resilience to climate extremes, linking the urban energy transition with climate change adaptation for infrastructure.',
  'stakeholders-to-convene-in-zagreb-for-the-nzebra-project-shaping-the-sustainable-future-of-buildings':
    'Press release: stakeholders convene in Zagreb to shape the sustainable future of buildings under the nZEBRA project.',
  'sustainability-starts-here-the-power-of-educating-in-green-construction':
    'Why educating in green construction matters as the sector adopts circular economy principles and works to cut its carbon footprint.',
  'the-co-created-nzebra-course-at-halmstad-university':
    'How the nZEBRA course was co-created at Halmstad University, blending research and practice to teach climate-neutral building design.',
  'the-second-nzebra-summer-school-concludes-in-halmstad-equipping-students-with-practical-skills-for-sustainable-buildings':
    'The second nZEBRA Summer School at Halmstad brought students and partners together for an intensive week on nearly zero-energy buildings.',
  'youth-leading-climate-action-for-sustainable-cities':
    'On World Cities Day, nZEBRA explores how young people lead climate and local action for more sustainable, resilient cities.',
};

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

// --- discover slugs from the live listing -------------------------------------
async function discoverSlugs() {
  const html = await getText(`${SITE}/news-events`);
  const set = new Set();
  for (const m of html.matchAll(/href="\/post\/([a-z0-9-]+)"/g)) set.add(m[1]);
  return [...set].sort();
}

// --- image download -----------------------------------------------------------
function cleanFilename(url) {
  const raw = decodeURIComponent(url.split('/').pop().split('?')[0]);
  const ext = extname(raw) || '.jpg';
  const base = raw.slice(0, raw.length - ext.length);
  const safe = base.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${safe || 'image'}${ext.toLowerCase()}`;
}

async function downloadImage(url, slug, seen) {
  if (seen.has(url)) return seen.get(url);
  const file = cleanFilename(url);
  const dir = join(IMG_ROOT, slug);
  await mkdir(dir, { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`image ${url} -> ${res.status}`);
  await writeFile(join(dir, file), Buffer.from(await res.arrayBuffer()));
  const local = `/images/news/${slug}/${file}`;
  seen.set(url, local);
  return local;
}

async function downloadAsset(url, slug) {
  const file = cleanFilename(url);
  const dir = join(DOC_ROOT, slug);
  await mkdir(dir, { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`asset ${url} -> ${res.status}`);
  await writeFile(join(dir, file), Buffer.from(await res.arrayBuffer()));
  return `/documents/news/${slug}/${file}`;
}

// --- HTML -> Markdown (strict whitelist) --------------------------------------
const INLINE = { strong: '**', b: '**', em: '*', i: '*' };

function collapse(s) {
  return s.replace(/\s+/g, ' ');
}

// Converts a parsed node tree to Markdown. `imgMap` maps remote URL -> local path.
function toMarkdown(node, imgMap, depth = 0) {
  if (node.nodeType === 3) return collapse(node.rawText); // text node

  const tag = node.rawTagName?.toLowerCase();
  const kids = () => node.childNodes.map((c) => toMarkdown(c, imgMap, depth)).join('');

  switch (tag) {
    case 'h1':
    case 'h2':
      return `\n\n## ${collapse(node.text).trim()}\n\n`;
    case 'h3':
      return `\n\n### ${collapse(node.text).trim()}\n\n`;
    case 'h4':
    case 'h5':
    case 'h6':
      return `\n\n#### ${collapse(node.text).trim()}\n\n`;
    case 'p':
      return `\n\n${kids().trim()}\n\n`;
    case 'br':
      return '  \n';
    case 'hr':
      return '\n\n---\n\n';
    case 'strong':
    case 'b':
    case 'em':
    case 'i': {
      const inner = kids().trim();
      return inner ? `${INLINE[tag]}${inner}${INLINE[tag]}` : '';
    }
    case 'a': {
      const href = node.getAttribute('href') || '';
      const text = kids().trim();
      if (!href) return text; // link was stripped (Brevo / broken local file)
      // Encode parens so a filename like "agenda (4).pdf" can't break the link.
      const safeHref = href.replace(/\(/g, '%28').replace(/\)/g, '%29');
      return `[${text || href}](${safeHref})`;
    }
    case 'ul':
    case 'ol': {
      const ordered = tag === 'ol';
      let i = 0;
      const items = node.childNodes
        .filter((c) => c.rawTagName?.toLowerCase() === 'li')
        .map((li) => {
          i += 1;
          const marker = ordered ? `${i}.` : '-';
          const body = li.childNodes.map((c) => toMarkdown(c, imgMap, depth + 1)).join('').trim();
          return `${marker} ${body}`;
        });
      return `\n\n${items.join('\n')}\n\n`;
    }
    case 'li':
      return kids().trim();
    case 'blockquote':
      return `\n\n> ${collapse(node.text).trim()}\n\n`;
    case 'img': {
      const src = node.getAttribute('src') || '';
      const alt = (node.getAttribute('alt') || '').replace(/[[\]]/g, '');
      const local = imgMap.get(src) || src;
      return local ? `\n\n![${alt}](${local})\n\n` : '';
    }
    case 'figure':
    case 'figcaption':
    case 'div':
    case 'span':
    default:
      // Unknown / structural tags: keep their children, drop the tag itself.
      return kids();
  }
}

function tidy(md) {
  return md
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(new RegExp('[\u200B\u200C\u200D\u2060\uFEFF]', 'g'), '') // strip zero-width chars
    .trim();
}

function toISODate(text) {
  if (!text) return null;
  const d = new Date(`${text.trim()} UTC`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Typo corrections (point 8) for titles / text.
function fixText(s) {
  return s
    .replace(/green house/g, 'greenhouse')
    .replace(/Green house/g, 'Greenhouse')
    .replace(/Registraion/g, 'Registration');
}

// Remove the dead "subscribe to our newsletter" promo — no newsletter exists now.
function stripDeadNewsletterCta(md) {
  return md.replace(
    /,?\s*and don['’]t miss the first edition of the nZEBRA newsletter[\s\S]*?Subscribe here!/gi,
    '.',
  );
}

// --- per-article import -------------------------------------------------------
async function importPost(slug, report) {
  const html = await getText(`${SITE}/post/${slug}`);
  const root = parse(html);

  const title = fixText(root.querySelector('h1.uui-heading-large')?.text.trim() || '');
  const excerpt = fixText(tidy(root.querySelector('.uui-text-size-xlarge-3')?.text || ''));
  const dateText = root.querySelector('.uui-blogpost04_author-text')?.text.trim() || '';
  const pubDate = toISODate(dateText);

  // hero image lives in a background-image style on the image wrapper
  const heroWrap = root.querySelector('.uui-blogpost04_image-wrapper');
  // Require a quote delimiter: Webflow wraps the URL in &quot;...&quot;, and
  // filenames themselves can contain "(" and ")", so an unquoted match truncates.
  const heroMatch = heroWrap?.getAttribute('style')?.match(/url\(\s*(?:&quot;|["'])(.+?)(?:&quot;|["'])\s*\)/);
  const heroUrl = heroMatch?.[1];

  const richtext = root.querySelector('.uui-text-rich-text');
  const bodyImgs = richtext ? richtext.querySelectorAll('img').map((i) => i.getAttribute('src')).filter(Boolean) : [];

  // download images — a single failure is recorded, not fatal
  const seen = new Map();
  const imgErrors = [];
  const tryDownload = async (url) => {
    try {
      return await downloadImage(url, slug, seen);
    } catch (e) {
      imgErrors.push(`${url} (${e.message})`);
      return null;
    }
  };
  let heroLocal = null;
  if (heroUrl) heroLocal = await tryDownload(heroUrl);
  for (const src of bodyImgs) await tryDownload(src);

  // process anchors: download Webflow-hosted docs, drop Brevo / broken file:// links
  const docRemaps = [];
  const linkNotes = [];
  if (richtext) {
    for (const a of richtext.querySelectorAll('a')) {
      const href = a.getAttribute('href') || '';
      if (!href) continue;
      if (href.startsWith('file:')) {
        a.setAttribute('href', '');
        linkNotes.push(`removed broken local link: ${href}`);
      } else if (BREVO_HOST.test(href)) {
        a.setAttribute('href', '');
        linkNotes.push('removed Brevo newsletter link');
      } else if (WEBFLOW_HOST.test(href)) {
        try {
          const local = await downloadAsset(href, slug);
          a.setAttribute('href', local);
          docRemaps.push({ old: href, new: `${SITE}${local}` });
        } catch (e) {
          linkNotes.push(`asset download failed: ${href} (${e.message})`);
        }
      } else if (/^https?:\/\/(www\.)?nzebra\.eu\//i.test(href)) {
        // internal link -> relative path, with the ESG module typo corrected
        const rel = href
          .replace(/^https?:\/\/(www\.)?nzebra\.eu/i, '')
          .replace(
            '/course/environmental-social-and-governmence-strategies',
            '/course/indoor-climate-heating-cooling-ventilation',
          );
        a.setAttribute('href', rel);
      }
    }
  }

  // body markdown (anchors now rewritten in-place)
  let body = richtext ? stripDeadNewsletterCta(fixText(tidy(toMarkdown(richtext, seen)))) : '';

  // field checks for the human to verify later
  const missing = [];
  if (!title) missing.push('title');
  if (!excerpt) missing.push('description');
  if (!pubDate) missing.push(`pubDate (raw: "${dateText}")`);
  if (!heroLocal) missing.push('heroImage');
  if (!body) missing.push('body');
  for (const e of imgErrors) missing.push(`image failed: ${e}`);
  for (const n of linkNotes) missing.push(n);
  if (missing.length) report.push({ slug, missing });

  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(excerpt)}`,
    `metaDescription: ${JSON.stringify(META[slug] || excerpt.slice(0, 155))}`,
    `pubDate: ${pubDate || '2024-01-01'}`,
    heroLocal ? `heroImage: ${JSON.stringify(heroLocal)}` : null,
    heroLocal ? `heroImageAlt: ${JSON.stringify(title)}` : null,
    `sourceUrl: ${JSON.stringify(`${SITE}/post/${slug}`)}`,
    '---',
    '',
  ].filter((l) => l !== null).join('\n');

  await mkdir(CONTENT_DIR, { recursive: true });
  await writeFile(join(CONTENT_DIR, `${slug}.md`), `${fm}${body}\n`);
  return { slug, title, pubDate, images: seen.size, docRemaps };
}

// --- main ---------------------------------------------------------------------
await rm(CONTENT_DIR, { recursive: true, force: true });
await rm(IMG_ROOT, { recursive: true, force: true });

const slugs = await discoverSlugs();
console.log(`Discovered ${slugs.length} posts.\n`);

const report = [];
for (const slug of slugs) {
  const r = await importPost(slug, report);
  console.log(`✓ ${r.slug}  (${r.pubDate || 'NO DATE'}, ${r.images} img)`);
}

console.log('\n--- fields needing manual verification ---');
if (!report.length) console.log('none — all articles have title, description, date, hero and body.');
for (const r of report) console.log(`• ${r.slug}: missing ${r.missing.join(', ')}`);
