import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLinkSearch } from '../app/utils/link-search.ts'
const link = { id: '1', title: '東京 Coffee', description: '車站旁的深夜咖啡店', url: 'https://example.com/%E6%97%A5%E6%9C%AC?place=123', tags: ['旅遊', '待去'], imageUrl: '', createdAt: 1 }

test('search matches all four fields and decoded URLs', () => {
  for (const query of ['東京', '深夜', 'place=123', '旅遊', '日本']) assert.equal(createLinkSearch(query)(link), true)
})
test('mixed search terms can match different fields, but all must match', () => {
  assert.equal(createLinkSearch('東京 深夜 example.com 待去')(link), true)
  assert.equal(createLinkSearch('東京 早餐')(link), false)
  assert.equal(createLinkSearch('東京 不存在')(link), false)
})
test('normalizes width, case and extra whitespace without matching an empty collection', () => {
  assert.equal(createLinkSearch('  ＣＯＦＦＥＥ\n旅遊 ')(link), true)
  assert.equal(createLinkSearch('  ')(link), true)
  assert.deepEqual([].filter(createLinkSearch('東京')), [])
})
test('malformed URL escapes do not break search', () => {
  assert.equal(createLinkSearch('深夜')({ ...link, url: 'https://example.com/%ZZ' }), true)
})
