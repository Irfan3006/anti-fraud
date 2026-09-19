import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://anti-fraud-eight.vercel.app',
  output: 'server',
  adapter: vercel({
    webAnalytics: {
      enabled: false
    }
  }),
  security: {
    checkOrigin: false
  }
});
