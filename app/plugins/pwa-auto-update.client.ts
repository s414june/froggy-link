import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000

export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  let isReloading = false

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateServiceWorker(true)
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        return
      }

      window.setInterval(() => {
        registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
    }
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloading) {
      return
    }

    isReloading = true
    window.location.reload()
  })
})
