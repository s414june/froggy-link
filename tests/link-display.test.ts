import assert from 'node:assert/strict'
import { test } from 'node:test'
import { linkDisplayText } from '../app/utils/link-display.ts'

test('identical title and description use website label without deleting body', () => {
  assert.deepEqual(linkDisplayText('https://www.example.com/post', '內容\n內容', '內容 內容'), { title: 'example.com', description: '內容 內容' })
})
test('duplicated body is removed while separate title is kept', () => {
  const body = '這是一段很長的內容，用來驗證標題重複內文的情況。'
  assert.deepEqual(linkDisplayText('https://example.com', `文章名稱：${body}`, body), { title: '文章名稱', description: body })
})
test('long verbatim captions are removed but short meaningful headings remain', () => {
  const caption = '長篇內容'.repeat(30)
  assert.equal(linkDisplayText('https://example.com', caption, caption + '其餘內容').title, 'example.com')
  assert.equal(linkDisplayText('https://example.com', '文章名稱', '文章名稱以及更多介紹').title, '文章名稱')
  assert.equal(linkDisplayText('https://example.com', '完全不同的標題', caption).title, '完全不同的標題')
})

test('Facebook reel counts and full caption become author heading and full description', () => {
  const caption = '完整貼文內容，這裡包含更多介紹與資訊。'
  assert.deepEqual(linkDisplayText('https://www.facebook.com/share/r/19qd6Ke2PN/', `3,770 個心情 · 111 次分享 | ${caption} | 100均チャンネル`, '完整貼文內容，這裡...'), { title: '100均チャンネル · Facebook', description: caption })
  assert.deepEqual(linkDisplayText('https://www.facebook.com/reel/123/', `10 reactions | ${caption}`, ''), { title: 'Facebook 貼文', description: caption })
})
