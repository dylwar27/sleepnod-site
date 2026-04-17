import { defineConfig } from 'astro/config';

// Phase 1 deploys to an unguessable Vercel preview URL.
// When a custom domain lands, set `site` to the domain and add `public/CNAME`.
export default defineConfig({
  site: 'https://sleepnod.example',
  output: 'static',
  trailingSlash: 'ignore',
});
