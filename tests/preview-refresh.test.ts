import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyPreviewRefresh } from '../app/utils/preview-refresh.ts'
import { toStoredLink } from '../app/utils/link-storage.ts'
import { selectedTagsFirst } from '../app/utils/tag-order.ts'
const current = { id: 'saved', url: 'https://shopee.tw/product/1/2', title: '商品', description: '原敘述', imageUrl: 'https://image.thum.io/get/https://shopee.tw/product/1/2', tags: ['購物'], createdAt: 123 }
test('successful refresh persists empty image instead of retaining old screenshot', () => {
  const updated = applyPreviewRefresh(current, { succeeded: true, title: '商品新標題', description: '', imageUrl: '' })
  assert.deepEqual(structuredClone(toStoredLink(updated)), { ...current, title: '商品新標題', imageUrl: '', metadataVersion: 1 })
  assert.ok(current.imageUrl)
})
test('explicit refresh removes obsolete screenshot even when metadata is empty', () => {
  assert.equal(applyPreviewRefresh(current, { succeeded: true, title: '', description: '', imageUrl: '' }).imageUrl, '')
})
test('network failures preserve the record, and real new images replace screenshots', () => {
  assert.throws(() => applyPreviewRefresh(current, { succeeded: false, title: '', description: '', imageUrl: '' }))
  assert.equal(applyPreviewRefresh(current, { succeeded: true, title: '', description: '', imageUrl: 'https://example.com/product.jpg' }).imageUrl, 'https://example.com/product.jpg')
})
test('selected tags move first without changing base order and return on deselection', () => {
  const base = ['日本', '購物', '美食', '旅遊']
  assert.deepEqual(selectedTagsFirst(base, ['旅遊', '購物']), ['購物', '旅遊', '日本', '美食'])
  assert.deepEqual(selectedTagsFirst(base, []), base)
  assert.deepEqual(base, ['日本', '購物', '美食', '旅遊'])
})
