import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPwaInstall } from '../app/utils/pwa-install.ts'

const setup = (options: { android?: boolean, standalone?: boolean, storageBlocked?: boolean } = {}) => {
  const storage = new Map<string, string>()
  const media = Object.assign(new EventTarget(), { matches: options.standalone ?? false })
  const browser = Object.assign(new EventTarget(), {
    navigator: { userAgent: options.android === false ? 'iPhone Safari' : 'Android Chrome' },
    matchMedia: () => media,
    sessionStorage: {
      getItem: (key: string) => {
        if (options.storageBlocked) throw new Error('Storage blocked')
        return storage.get(key) ?? null
      },
      setItem: (key: string, value: string) => {
        if (options.storageBlocked) throw new Error('Storage blocked')
        storage.set(key, value)
      }
    }
  })
  const controller = createPwaInstall(browser as unknown as Window)
  const offer = (outcome = 'accepted', fails = false) => {
    let calls = 0
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => { calls++; if (fails) throw new Error('Prompt failed') },
      userChoice: Promise.resolve({ outcome })
    })
    browser.dispatchEvent(event)
    return { event, calls: () => calls }
  }
  return { controller, browser, offer }
}

test('Android banner waits for browser eligibility and keeps an early event', async () => {
  const { controller, offer, browser } = setup()
  assert.equal(controller.showBanner.value, false)
  const prompt = offer()
  assert.equal(prompt.event.defaultPrevented, true)
  assert.equal(controller.showBanner.value, true)
  assert.equal(prompt.calls(), 0)
  await Promise.all([controller.install(), controller.install()])
  assert.equal(prompt.calls(), 1)
  assert.equal(controller.showBanner.value, false)
  browser.dispatchEvent(new Event('appinstalled'))
  assert.equal(controller.isInstalled.value, true)
  offer()
  assert.equal(controller.canInstall.value, false)
})

test('dismissal survives reload but still allows the settings install button', async () => {
  const { controller, offer, browser } = setup()
  const prompt = offer()
  controller.dismiss()
  assert.equal(controller.showBanner.value, false)
  assert.equal(controller.canInstall.value, true)
  await controller.install()
  assert.equal(prompt.calls(), 1)
  controller.dispose()
  const next = createPwaInstall(browser as unknown as Window)
  offer()
  assert.equal(next.showBanner.value, false)
  assert.equal(next.canInstall.value, true)
})

test('iOS and already installed apps never show the Android banner', () => {
  for (const options of [{ android: false }, { standalone: true }]) {
    const { controller, offer } = setup(options)
    offer()
    assert.equal(controller.showBanner.value, false)
  }
})

test('declining the native prompt suppresses another banner this visit', async () => {
  const { controller, offer } = setup()
  offer('dismissed')
  await controller.install()
  offer()
  assert.equal(controller.showBanner.value, false)
})

test('blocked storage and rejected prompt do not break installation controls', async () => {
  const { controller, offer } = setup({ storageBlocked: true })
  offer('accepted', true)
  await controller.install()
  assert.equal(controller.installing.value, false)
  assert.match(controller.statusMessage.value, /目前無法/)
  offer()
  controller.dismiss()
  assert.equal(controller.showBanner.value, false)
})

test('server rendering has no banner and missing prompt gives manual guidance', async () => {
  assert.equal(createPwaInstall().showBanner.value, false)
  const { controller } = setup()
  await controller.install()
  assert.match(controller.statusMessage.value, /Chrome/)
})
