import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../app/components/CollectionView.vue', import.meta.url), 'utf8')
const handler = source.split('const removeTagsFromSelection = ')[1]!.split('const deleteSelectedLinks =')[0]!.trim()
const setup = (count: number | undefined = 2) => {
  const calls: unknown[] = []
  const notices: string[] = []
  const state = {
    addingBatchTag: { value: false }, isBatchMode: { value: true },
    selectedTagFilters: { value: ['日本', '旅遊'] },
    selectedLinkIds: { value: ['a', 'b'] }, hasSelectedLinks: { value: true },
    showShareHint: (text: string) => notices.push(text),
    removeTagsFromSelectedLinks: async (...args: unknown[]): Promise<number | undefined> => { calls.push(args); return count }
  }
  const submit = new Function(...Object.keys(state), `return (${handler})`)(...Object.values(state))
  return { state, calls, notices, submit }
}
test('batch removal sends selected IDs and active filters, then clears selection', async () => {
  const flow = setup()
  await flow.submit()
  assert.deepEqual(flow.calls, [[['a', 'b'], ['日本', '旅遊']]])
  assert.deepEqual(flow.state.selectedLinkIds.value, [])
  assert.deepEqual(flow.state.selectedTagFilters.value, ['日本', '旅遊'])
  assert.equal(flow.state.addingBatchTag.value, false)
  assert.deepEqual(flow.notices, ['已從 2 筆收藏移除篩選標籤！'])
})
test('failed persistence retains selection for retry', async () => {
  const flow = setup()
  flow.state.removeTagsFromSelectedLinks = async () => undefined
  const submit = new Function(...Object.keys(flow.state), `return (${handler})`)(...Object.values(flow.state))
  await submit()
  assert.deepEqual(flow.state.selectedLinkIds.value, ['a', 'b'])
  assert.equal(flow.state.addingBatchTag.value, false)
  assert.deepEqual(flow.notices, [])
})
test('no filters or pending update cannot remove tags; missing selection gives a hint', async () => {
  const noFilters = setup()
  noFilters.state.selectedTagFilters.value = []
  await noFilters.submit()
  assert.deepEqual(noFilters.calls, [])
  const pending = setup()
  pending.state.addingBatchTag.value = true
  await pending.submit()
  assert.deepEqual(pending.calls, [])
  const empty = setup()
  empty.state.hasSelectedLinks.value = false
  await empty.submit()
  assert.deepEqual(empty.calls, [])
  assert.deepEqual(empty.notices, ['請先勾選要移除標籤的收藏。'])
})
