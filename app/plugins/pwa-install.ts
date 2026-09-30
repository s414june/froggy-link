import { createPwaInstall } from '~/utils/pwa-install'

export default defineNuxtPlugin(() => {
  // Register before page mounting so an early install event is retained.
  const pwaInstall = createPwaInstall(import.meta.client ? window : undefined)
  if (import.meta.hot) {
    import.meta.hot.dispose(pwaInstall.dispose)
  }
  return { provide: { pwaInstall } }
})
