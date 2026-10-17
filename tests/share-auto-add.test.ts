import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Exercise the actual sharing entry point with browser/storage boundaries stubbed.
const source = readFileSync(new URL('../app/components/CollectionView.vue', import.meta.url), 'utf8')
const receive = source.split('const receiveSharedLink = ')[1]!.split('\nwatch(() => route.query')[0]!.trim()
const makeShare = (options: { android?: boolean, enabled?: boolean, ready?: boolean, detail?: boolean, result?: string, valid?: boolean } = {}) => {
  const events: string[] = []
  const notices: string[] = []
  const route = { path: '/', query: { url: 'https://example.com/', title: '分享', keep: '1' }, hash: '' }
  const dependencies = {
    shareReady: options.ready ?? true,
    isDetailRoute: { value: options.detail ?? false },
    hydrateFromShareQuery: () => options.valid ?? true,
    route,
    receivedSharedLink: { value: false },
    navigateTo: async (target: { query: typeof route.query }, navigation: { replace: boolean }) => {
      assert.equal(navigation.replace, true)
      route.query = target.query
      events.push('clean-query')
    },
    window: { scrollTo: () => {} },
    isAndroid: { value: options.android ?? true },
    autoAddSharedLink: { value: options.enabled ?? false },
    saveLink: async () => { events.push('save'); return options.result },
    showShareHint: (message: string) => notices.push(message),
    promptShareTags: async () => { events.push('focus-and-highlight') }
  }
  const run = new Function(...Object.keys(dependencies), `return (${receive})`)(...Object.values(dependencies))
  return { run, events, notices, route }
}

test('default-off Android share focuses tags without creating a bookmark', async () => {
  const flow = makeShare()
  await flow.run()
  assert.deepEqual(flow.events, ['clean-query', 'focus-and-highlight'])
  assert.deepEqual(flow.route.query, { keep: '1' })
})
test('enabled Android share saves immediately after removing consumed query', async () => {
  const flow = makeShare({ enabled: true, result: 'created' })
  await flow.run()
  assert.deepEqual(flow.events, ['clean-query', 'save'])
  assert.deepEqual(flow.notices, ['已自動新增分享連結！'])
})
test('duplicate auto-add uses the existing duplicate notice', async () => {
  const flow = makeShare({ enabled: true, result: 'duplicate' })
  await flow.run()
  assert.deepEqual(flow.events, ['clean-query', 'save'])
  assert.deepEqual(flow.notices, ['這個連結已經建立過囉！'])
})
test('non-Android remains manual even when the preference is enabled', async () => {
  const flow = makeShare({ android: false, enabled: true })
  await flow.run()
  assert.deepEqual(flow.events, ['clean-query', 'focus-and-highlight'])
})
test('unsuccessful auto-add returns focus for manual correction instead of reporting success', async () => {
  const flow = makeShare({ enabled: true })
  await flow.run()
  assert.deepEqual(flow.events, ['clean-query', 'save', 'focus-and-highlight'])
  assert.deepEqual(flow.notices, ['自動新增未完成，請確認連結後再試。'])
})
test('shares wait for settings and IndexedDB hydration, and do not run on detail pages or empty queries', async () => {
  for (const options of [{ ready: false }, { detail: true }, { valid: false }]) {
    const flow = makeShare({ enabled: true, ...options })
    await flow.run()
    assert.deepEqual(flow.events, [])
  }
})
