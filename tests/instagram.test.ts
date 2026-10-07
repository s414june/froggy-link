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

test('Instagram fallback title never repeats unrecognized caption formats', () => {
  const url = 'https://www.instagram.com/share/example/'
  assert.deepEqual(instagramDisplayText(url, '作者分享了一段很長的內容', '完整內文'), { title: 'Instagram 貼文', description: '完整內文' })
  assert.deepEqual(instagramDisplayText(url, '只有內文沒有作者', ''), { title: 'Instagram 貼文', description: '只有內文沒有作者' })
  assert.deepEqual(instagramDisplayText(url, '商品內文', '270 likes, 0 comments - hituzi__official on September 25, 2026: 商品內文'), { title: '@hituzi__official · Instagram', description: '270 likes, 0 comments - hituzi__official on September 25, 2026: 商品內文' })
})
test('Instagram author titles remain stable after repeated preview normalization', () => {
  const url = 'https://www.instagram.com/p/ABC/'
  const first = instagramDisplayText(url, 'Author (@author) • Instagram photos and videos', 'caption')
  assert.deepEqual(first, { title: 'Author (@author) · Instagram', description: 'caption' })
  assert.deepEqual(instagramDisplayText(url, first.title, first.description), first)
})
