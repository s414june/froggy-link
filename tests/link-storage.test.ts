import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reactive } from 'vue'
import { toStoredLink } from '../app/utils/link-storage.ts'

const fixture = () => ({
  id: 'saved-link',
  url: 'https://www.threads.com/share/example/',
  title: '大阪民宿｜七森',
  description: '在日本鄉下的古民家 🐸',
  imageUrl: '',
  tags: ['日本', '古民宅'],
  createdAt: 123,
  metadataVersion: 1
})

test('reactive migration records become structured-cloneable IndexedDB data', () => {
  const link = reactive(fixture())
  assert.throws(() => structuredClone(link), { name: 'DataCloneError' })
  assert.deepEqual(structuredClone(toStoredLink(link)), fixture())
})

test('preview refresh with a spread object still copies nested reactive tags', () => {
  const link = reactive(fixture())
  const updated = { ...link, title: '更新後的標題' }
  assert.throws(() => structuredClone(updated), { name: 'DataCloneError' })
  const snapshot = toStoredLink(updated)
  assert.deepEqual(structuredClone(snapshot), { ...fixture(), title: '更新後的標題' })
  link.tags.push('旅行')
  assert.deepEqual(snapshot.tags, ['日本', '古民宅'])
})

test('ordinary new links and legacy records retain their persisted values', () => {
  const { metadataVersion, ...legacy } = fixture()
  assert.deepEqual(structuredClone(toStoredLink(legacy)), legacy)
  assert.deepEqual(structuredClone(toStoredLink(fixture())), fixture())
})
