import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyPreviewRefresh, applyRepeatedLinkPreview } from '../app/utils/preview-refresh.ts'
import { toStoredLink } from '../app/utils/link-storage.ts'
import { selectedTagsFirst } from '../app/utils/tag-order.ts'
const current = { id: 'saved', url: 'https://shopee.tw/product/1/2', title: '商品', description: '原敘述', imageUrl: 'https://image.thum.io/get/https://shopee.tw/product/1/2', tags: ['購物'], createdAt: 123 }
test('successful refresh persists empty image instead of retaining old screenshot', () => {
  const updated = applyPreviewRefresh(current, { succeeded: true, title: '商品新標題', description: '', imageUrl: '' })
  assert.deepEqual(structuredClone(toStoredLink(updated)), { ...current, title: '商品新標題', description: '', imageUrl: '', metadataVersion: 1 })
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


test('Maps refresh clears stale description and persists the empty value without changing user data', () => {
  const saved = { ...current, url: 'https://maps.app.goo.gl/EHYdfi84qGFML6Hu7?g_st=ac', description: 'Find local businesses, view maps and get driving directions in Google Maps.', imageUrl: '' }
  const updated = applyPreviewRefresh(saved, { succeeded: true, title: '不只是圖書館 Not Just Library', description: '', imageUrl: '' })
  const stored = structuredClone(toStoredLink(updated))
  assert.equal(stored.description, '')
  assert.equal(stored.title, '不只是圖書館 Not Just Library')
  assert.equal(stored.id, saved.id)
  assert.equal(stored.url, saved.url)
  assert.deepEqual(stored.tags, saved.tags)
  assert.equal(stored.createdAt, saved.createdAt)
  assert.ok(saved.description)
})

test('failed or unavailable previews keep the old description intact', () => {
  const saved = { ...current, imageUrl: '' }
  for (const succeeded of [false, true]) {
    assert.throws(() => applyPreviewRefresh(saved, { succeeded, title: '', description: '', imageUrl: '' }))
    assert.equal(saved.description, '原敘述')
  }
  assert.equal(applyPreviewRefresh(saved, { succeeded: true, title: '新標題', description: '新敘述', imageUrl: '' }).description, '新敘述')
})


test('every preview field is replaced, including an absent title, in both update paths', () => {
  for (const metadata of [
    { title: '新標題', description: '', imageUrl: '' },
    { title: '', description: '新敘述', imageUrl: '' },
    { title: '', description: '', imageUrl: 'https://example.com/new.jpg' }
  ]) {
    const result = { ...metadata, succeeded: true }
    for (const updated of [applyPreviewRefresh(current, result), applyRepeatedLinkPreview(current, result, current.tags)]) {
      assert.equal(updated.title, metadata.title)
      assert.equal(updated.description, metadata.description)
      assert.equal(updated.imageUrl, metadata.imageUrl)
      assert.deepEqual(toStoredLink(updated), { ...current, ...metadata, metadataVersion: 1 })
    }
  }
})

test('re-adding on failure merges tags without changing any preview fields', () => {
  const updated = applyRepeatedLinkPreview(current, { succeeded: false, title: '', description: '', imageUrl: '' }, ['購物', '新標籤'])
  assert.deepEqual(updated, { ...current, tags: ['購物', '新標籤'] })
})
