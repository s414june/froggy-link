import assert from 'node:assert/strict'
import { test } from 'node:test'
import { repairLegacyLink } from '../app/utils/link-migration.ts'

const old = {
  id: 'saved-link', url: 'https://www.threads.com/share/BAaF9XfVWb/',
  title: '&#x5927;&#x962a;&#x6c11;&#x5bbf;&#xff5c;&#x4e03;&#x68ee; (&#064;laforet2024.jp) on Threads',
  description: '&#x5728;&#x65e5;&#x672c; 🐸',
  imageUrl: 'https://example.com/photo.jpg', tags: ['日本', '古民宅'], createdAt: 123
}

test('repairs saved Threads text without changing bookmark identity or tags', () => {
  const result = repairLegacyLink(old)
  assert.equal(result.title, '大阪民宿｜七森 (@laforet2024.jp) on Threads')
  assert.equal(result.description, '在日本 🐸')
  assert.deepEqual({ ...result, title: old.title, description: old.description, metadataVersion: undefined }, { ...old, metadataVersion: undefined })
  assert.equal(result.metadataVersion, 1)
  assert.equal(repairLegacyLink(result), result)
})

test('current records preserve intentionally literal HTML reference text', () => {
  const current = { ...old, metadataVersion: 1, title: '教學範例：&#x5927;' }
  assert.equal(repairLegacyLink(current), current)
})
