import { computed, ref, shallowRef } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'froggy-link-install-dismissed'

export const createPwaInstall = (browser?: Window) => {
  const pendingPrompt = shallowRef<InstallPromptEvent | null>(null)
  const isAndroid = ref(false)
  const isInstalled = ref(false)
  const dismissed = ref(false)
  const installing = ref(false)
  const statusMessage = ref('')
  const canInstall = computed(() => !!pendingPrompt.value && !isInstalled.value && !installing.value)
  const showBanner = computed(() => isAndroid.value && canInstall.value && !dismissed.value)
  const displayMode = browser?.matchMedia('(display-mode: standalone), (display-mode: minimal-ui), (display-mode: fullscreen)')

  if (browser) {
    isAndroid.value = /Android/i.test(browser.navigator.userAgent)
    isInstalled.value = !!displayMode?.matches
    try {
      dismissed.value = browser.sessionStorage.getItem(DISMISSED_KEY) === 'true'
    }
    catch {
      // Installation still works when browser storage is unavailable.
    }
  }

  const dismiss = () => {
    dismissed.value = true
    try {
      browser?.sessionStorage.setItem(DISMISSED_KEY, 'true')
    }
    catch {
      // Keep the in-memory preference for this visit.
    }
  }

  const beforeInstall = (event: Event) => {
    if (isInstalled.value) return
    event.preventDefault()
    pendingPrompt.value = event as InstallPromptEvent
    statusMessage.value = ''
  }

  const installed = () => {
    isInstalled.value = true
    pendingPrompt.value = null
    statusMessage.value = '已安裝到主畫面。'
  }

  const onDisplayChange = (event: MediaQueryListEvent) => {
    if (event.matches) installed()
  }

  const install = async () => {
    if (installing.value) return
    if (isInstalled.value) {
      statusMessage.value = '已安裝到主畫面。'
      return
    }
    const event = pendingPrompt.value
    if (!event) {
      statusMessage.value = isAndroid.value
        ? '若未出現安裝視窗，請用 Chrome 開啟此網站，從選單選擇「安裝應用程式」或「加到主畫面」。'
        : '請從瀏覽器的選單或分享功能選擇「加到主畫面」或「安裝應用程式」。'
      return
    }

    pendingPrompt.value = null
    installing.value = true
    statusMessage.value = ''
    try {
      // Call directly from the click handler to preserve user activation.
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') {
        statusMessage.value = '安裝流程已啟動。'
      }
      else {
        dismiss()
        statusMessage.value = '已取消安裝，可稍後從瀏覽器選單安裝。'
      }
    }
    catch {
      statusMessage.value = '目前無法開啟安裝視窗，請從瀏覽器選單安裝，或重新整理後再試。'
    }
    finally {
      installing.value = false
    }
  }

  browser?.addEventListener('beforeinstallprompt', beforeInstall)
  browser?.addEventListener('appinstalled', installed)
  displayMode?.addEventListener('change', onDisplayChange)

  const dispose = () => {
    browser?.removeEventListener('beforeinstallprompt', beforeInstall)
    browser?.removeEventListener('appinstalled', installed)
    displayMode?.removeEventListener('change', onDisplayChange)
  }

  return { canInstall, showBanner, isInstalled, installing, statusMessage, install, dismiss, dispose }
}
