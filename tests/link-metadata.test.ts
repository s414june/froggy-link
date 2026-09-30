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
