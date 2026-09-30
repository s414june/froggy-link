// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '🐸 Froggy Link',
      short_name: '🐸 Froggy Link',
      description: '手動整理連結、標籤分類與離線儲存的簡易 PWA',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon'
        }
      ],
      share_target: {
        action: '/',
        method: 'GET',
        params: {
          title: 'title',
          text: 'text',
          url: 'url'
        }
      }
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,json}']
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})
