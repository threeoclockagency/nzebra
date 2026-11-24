// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';

// nZEBRA — 100% static site. No server adapter: no SSR, no serverless, no middleware.
export default defineConfig({
  site: 'https://nzebra.eu',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  // Directory format + no trailing slash gives clean canonical URLs
  // (https://nzebra.eu/about-us) that match the current Webflow URLs.
  markdown: {
    // Sanitise first (drops any raw HTML), then mark external links safe.
    rehypePlugins: [
      rehypeSanitize,
      [
        rehypeExternalLinks,
        { target: '_blank', rel: ['noopener', 'noreferrer'], protocols: ['http', 'https', 'mailto'] },
      ],
    ],
  },
});
