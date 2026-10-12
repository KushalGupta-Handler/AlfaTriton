// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static build: `npm run build` outputs plain files in dist/ that upload to any host (Havealook/cPanel).
export default defineConfig({
  site: 'https://www.alfatriton.com.au',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !/\/(thank-you|404)\/?$/.test(page) && !page.includes('/lab/'),
    }),
  ],
  build: { inlineStylesheets: 'auto' },
});
