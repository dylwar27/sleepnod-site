import { defineConfig } from 'astro/config';

// GitHub Pages publishes this repo at https://dylwar27.github.io/sleepnod-site/.
// When a custom domain lands: swap `site` to the domain, set `base: '/'`,
// and add a `public/CNAME` file with the domain.
export default defineConfig({
  site: 'https://dylwar27.github.io',
  base: '/sleepnod-site',
  output: 'static',
  trailingSlash: 'ignore',
});
