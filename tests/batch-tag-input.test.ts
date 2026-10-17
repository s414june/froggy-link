import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const source = readFileSync(new URL('../app/components/CollectionView.vue', import.meta.url), 'utf8')
const handler = source.split('const syncBatchTagInput = ')[1]!.split('\nconst addingBatchTag')[0]!.trim()
test('batch input tracks visible text during IME composition and clears after deletion', () => {
  const batchTagInput = { value: '' }
  const sync = new Function('batchTagInput', `return (${stripTypeScriptTypes(handler)})`)(batchTagInput)
  sync({ target: { value: '日本旅遊', composing: true }, isComposing: true })
  assert.equal(batchTagInput.value, '日本旅遊')
  sync({ target: { value: '' }, isComposing: false })
  assert.equal(batchTagInput.value, '')
})

const submitSource = source.split('const addTagToSelection = ')[1]!.split('\nconst toggleBatchMode')[0]!.trim()
const setupSubmit = (selected: string[], visibleText: string) => {
  const notices: string[] = []
  const calls: unknown[] = []
  const state = {
    addingBatchTag: { value: false },
    batchTagInput: { value: '' },
    batchTagInputElement: { value: { value: visibleText, focus: () => {} } },
    hasSelectedLinks: { value: selected.length > 0 },
    selectedLinkIds: { value: selected },
    showShareHint: (text: string) => notices.push(text),
    addTagToLinks: async (...args: unknown[]) => { calls.push(args); return selected.length }
  }
  const submit = new Function(...Object.keys(state), `return (${submitSource})`)(...Object.values(state))
  return { submit, notices, calls, state }
}
test('submission reads visible input even if the model is still empty', async () => {
  const flow = setupSubmit(['one', 'two'], ' 日本 ')
  await flow.submit()
  assert.deepEqual(flow.calls, [[['one', 'two'], '日本']])
  assert.equal(flow.state.addingBatchTag.value, false)
})
test('missing selection or text produces actionable feedback instead of silently doing nothing', async () => {
  const noSelection = setupSubmit([], '日本')
  await noSelection.submit()
  assert.deepEqual(noSelection.notices, ['請先勾選要新增標籤的收藏。'])
  const noText = setupSubmit(['one'], '  ')
  await noText.submit()
  assert.deepEqual(noText.notices, ['請先輸入要新增的標籤。'])
  assert.deepEqual(noText.calls, [])
})
