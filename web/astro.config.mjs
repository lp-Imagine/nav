// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

const base = process.env.PUBLIC_BASE || '/'

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE || 'https://lp-Imagine.github.io',
  base,
  trailingSlash: 'always',
  integrations: [react()],
  vite: {
    optimizeDeps: {
      include: [
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        'react',
        'react-dom',
      ],
    },
    server: {
      fs: {
        allow: ['..'],
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
  },
})
