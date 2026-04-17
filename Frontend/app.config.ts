import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  server: {
    preset: 'static',
    prerender: {
      routes: ['/'],
      crawlLinks: true,
    },
  },
  spa: true,
})