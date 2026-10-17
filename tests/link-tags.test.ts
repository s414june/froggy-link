import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appendLinkTag, removeLinkTags } from '../app/utils/link-tags.ts'
const item = { id: 'saved', title: '標題', description: '敘述', url: 'https://example.com', imageUrl: 'https://example.com/a.jpg', tags: ['旅遊'], createdAt: 123, metadataVersion: 1 }
test('appending a tag retains all saved fields and existing tags without mutating input', () => {
  const result = appendLinkTag(item, '  日本 住宿  ')
  assert.deepEqual(result.tags, ['日本 住宿', '旅遊'])
  assert.deepEqual({ ...result, tags: item.tags }, item)
  assert.deepEqual(item.tags, ['旅遊'])
})
test('empty or repeated tags do not create duplicates', () => {
  assert.equal(appendLinkTag(item, '  '), item)
  assert.equal(appendLinkTag(item, ' 旅遊 '), item)
  const once = appendLinkTag(item, '日本')
  assert.equal(appendLinkTag(once, '日本'), once)
})

test('removing filtered tags keeps unrelated tags and every saved field intact', () => {
  const original = { ...item, tags: ['旅遊', '日本', '住宿'] }
  const result = removeLinkTags(original, ['旅遊', '日本', '不存在'])
  assert.deepEqual(result.tags, ['住宿'])
  assert.deepEqual({ ...result, tags: original.tags }, original)
  assert.deepEqual(original.tags, ['旅遊', '日本', '住宿'])
  assert.deepEqual(removeLinkTags(item, ['旅遊']).tags, [])
  assert.equal(removeLinkTags(item, ['日本']), item)
  assert.equal(removeLinkTags(item, []), item)
})
