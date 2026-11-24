// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// nZEBRA — 100% static site. No server adapter: no SSR, no serverless, no middleware.
export default defineConfig({
  site: 'https://nzebra.eu',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  // Directory format + no trailing slash gives clean canonical URLs
  // (https://nzebra.eu/about-us) that match the current Webflow URLs.
  // Raw HTML in Markdown is sanitised at build time (rehype-sanitize wiring is
  // added together with the news collection in Fase 1) so no raw HTML reaches
  // the rendered page.
});
