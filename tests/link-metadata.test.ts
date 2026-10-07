import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveLinkMetadata } from '../server/utils/link-metadata.ts'

const page = (html: string, url = 'https://media.example/watch/123') => {
  const response = new Response(html)
  Object.defineProperty(response, 'url', { value: url })
  return response
}

const provider = () => Response.json({
  title: 'Provider title',
  thumbnail_url: 'https://media.example/thumbnail.jpg',
  provider_name: 'Media'
})

test('title-only pages still get a provider thumbnail', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url)
    return calls.length === 1 ? page('<title>Page title</title>') : provider()
  })
  assert.deepEqual(await resolveLinkMetadata('https://media.example/watch/123'), {
    title: 'Page title', description: 'Media', imageUrl: 'https://media.example/thumbnail.jpg'
  })
  assert.equal(calls.length, 2)
})

test('relative thumbnails resolve against the redirected page URL', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => page(
    '<meta property="og:title" content="Title"><meta name="description" content="Description"><meta property="og:image" content="../image.jpg">',
    'https://media.example/watch/123'
  ))
  assert.equal((await resolveLinkMetadata('https://short.example/123')).imageUrl, 'https://media.example/image.jpg')
  assert.equal(fetchMock.mock.calls.length, 1)
})

test('provider fallback receives the resolved short-link destination', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url)
    return calls.length === 1 ? page('<title>Title</title>') : provider()
  })
  await resolveLinkMetadata('https://short.example/123')
  assert.equal(new URL(calls[1]!).searchParams.get('url'), 'https://media.example/watch/123')
})

test('provider failure preserves partial page metadata', async (t) => {
  let count = 0
  t.mock.method(globalThis, 'fetch', async () => {
    if (++count === 1) return page('<title>Saved title</title>')
    throw new Error('Provider unavailable')
  })
  assert.deepEqual(await resolveLinkMetadata('https://media.example/watch/123'), {
    title: 'Saved title', description: '', imageUrl: ''
  })
})

test('page failure still allows provider metadata', async (t) => {
  let count = 0
  t.mock.method(globalThis, 'fetch', async () => {
    if (++count === 1) throw new Error('Page unavailable')
    return provider()
  })
  assert.equal((await resolveLinkMetadata('https://media.example/watch/123')).imageUrl, 'https://media.example/thumbnail.jpg')
})

for (const url of [
  'https://youtu.be/dQw4w9WgXcQ?si=android-share',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ?si=android-share',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/live/dQw4w9WgXcQ'
]) {
  test(`YouTube app link uses direct oEmbed: ${url}`, async (t) => {
    const calls: string[] = []
    t.mock.method(globalThis, 'fetch', async (endpoint: string) => {
      calls.push(endpoint)
      return provider()
    })
    assert.equal((await resolveLinkMetadata(url)).imageUrl, 'https://media.example/thumbnail.jpg')
    assert.equal(calls.length, 1)
    assert.equal(new URL(calls[0]!).origin, 'https://www.youtube.com')
    assert.equal(new URL(calls[0]!).searchParams.get('url'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
}

test('YouTube oEmbed failure falls back with the canonical video URL', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url)
    if (calls.length === 1) throw new Error('oEmbed unavailable')
    if (calls.length === 2) return page('<title>YouTube</title>')
    return provider()
  })
  assert.equal((await resolveLinkMetadata('https://www.youtube.com/shorts/dQw4w9WgXcQ')).imageUrl, 'https://media.example/thumbnail.jpg')
  assert.equal(new URL(calls[2]!).searchParams.get('url'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
})

test('Threads-style numeric entities decode Chinese, emoji and quoted text', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => page(
    `<meta property="og:title" content="&#x53F0;&#x7063; Threads &#128056;">
     <meta content="&#20013;&#25991; &quot;hello&quot; it's &amp; &nbsp;文字" property="og:description">
     <meta property="og:image" content="https://media.example/image.jpg?a=1&amp;b=2">`
  ))
  assert.deepEqual(await resolveLinkMetadata('https://www.threads.net/@example/post/123'), {
    title: '台灣 Threads 🐸',
    description: '中文 "hello" it\'s & \u00a0文字',
    imageUrl: 'https://media.example/image.jpg?a=1&b=2'
  })
})

test('HTML title entities decode once while literal entity text stays literal', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => page(
    '<title>&#x4E2D;&#x6587; &amp;#20013;</title><meta name="description" content="正常繁體中文"><meta property="og:image" content="/image.jpg">'
  ))
  const result = await resolveLinkMetadata('https://media.example/post')
  assert.equal(result.title, '中文 &#20013;')
  assert.equal(result.description, '正常繁體中文')
})

test('single-quoted metadata preserves double quotes and angle brackets', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => page(
    `<meta content='中文 "引言" > 文字' property='og:title'>
     <meta property='og:description' content='&#x4E2D;&#x6587;'>
     <meta property='og:image' content='/image.jpg'>`
  ))
  const result = await resolveLinkMetadata('https://media.example/post')
  assert.equal(result.title, '中文 "引言" > 文字')
  assert.equal(result.description, '中文')
})

test('Instagram uses clean post URL and author title while preserving caption and thumbnail', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url)
    return page('<meta property="og:title" content="Author on Instagram: &quot;caption&quot;"><meta name="twitter:title" content="Author (@author) • Instagram photos and videos"><meta property="og:description" content="caption"><meta property="og:image" content="https://scontent.cdninstagram.com/photo.jpg?a=1&amp;b=2">', 'https://www.instagram.com/p/ABC/')
  })
  const result = await resolveLinkMetadata('https://www.instagram.com/p/ABC/?stkn=tracking')
  assert.equal(calls[0], 'https://www.instagram.com/p/ABC/')
  assert.equal(result.title, 'Author (@author) · Instagram')
  assert.equal(result.description, 'caption')
  assert.equal(result.imageUrl, 'https://scontent.cdninstagram.com/photo.jpg?a=1&b=2')
})
