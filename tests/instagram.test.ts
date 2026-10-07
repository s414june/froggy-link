import { test } from 'node:test'
import assert from 'node:assert/strict'
import { instagramPostUrl, instagramDisplayText } from '../app/utils/instagram.ts'

test('Instagram post normalization excludes unrelated hosts and removes tracking', () => {
  assert.equal(instagramPostUrl('https://www.instagram.com/p/DdtfZHRkvrW/?stkn=abc'), 'https://www.instagram.com/p/DdtfZHRkvrW/')
  assert.equal(instagramPostUrl('https://www.instagram.com/person/p/ABC/'), 'https://www.instagram.com/p/ABC/')
  assert.equal(instagramPostUrl('https://instagram.com.evil.test/p/ABC/'), '')
  assert.equal(instagramPostUrl('https://www.instagram.com/accounts/login/'), '')
})
test('Instagram caption is removed from title without discarding body or changing other websites', () => {
  const url = 'https://www.instagram.com/p/ABC/'
  assert.deepEqual(instagramDisplayText(url, '作者 on Instagram: “長篇\n內文”', ''), { title: '作者 · Instagram', description: '長篇\n內文' })
  assert.deepEqual(instagramDisplayText(url, '作者 on Instagram: “內文”', '原始敘述'), { title: '作者 · Instagram', description: '原始敘述' })
  assert.deepEqual(instagramDisplayText('https://example.com', '相同', '相同'), { title: '相同', description: '相同' })
})
