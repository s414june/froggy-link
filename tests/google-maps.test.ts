import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyPreviewRefresh } from '../app/utils/preview-refresh.ts'
import { toStoredLink } from '../app/utils/link-storage.ts'
import { resolveLinkMetadata } from '../server/utils/link-metadata.ts'
import { googleMapsUrlLabel, isGoogleMapsUrl } from '../server/utils/google-maps.ts'

test('Maps URL labels decode place paths and search names without inventing addresses', () => {
  assert.equal(googleMapsUrlLabel('https://www.google.com/maps/place/%E5%8F%B0%E5%8C%97101/@25,121'), '台北101')
  assert.equal(googleMapsUrlLabel('https://www.google.com/maps/search/?api=1&query=Tokyo+Station'), 'Tokyo Station')
  assert.equal(googleMapsUrlLabel('https://maps.google.com/?q=place_id:abc'), '')
  assert.equal(isGoogleMapsUrl('https://google.com.evil.test/maps/place/Test'), false)
})
test('Maps short link resolves itemprop name address and image without noembed', async (t) => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url)
    const response = new Response('<meta itemprop="name" content="商家名稱 - Google 地圖"><meta itemprop="description" content="台北市信義區測試路1號"><meta itemprop="image" content="https://example.com/place.jpg">')
    Object.defineProperty(response, 'url', { value: 'https://www.google.com/maps/place/Test/' })
    return response
  })
  assert.deepEqual(await resolveLinkMetadata('https://maps.app.goo.gl/example'), { title: '商家名稱', description: '台北市信義區測試路1號', imageUrl: 'https://example.com/place.jpg' })
  assert.equal(calls.length, 1)
})
test('generic Maps metadata uses URL place name but hides unrelated default map', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<meta property="og:title" content="Google Maps"><meta property="og:description" content="Find local businesses"><meta property="og:image" content="https://example.com/server-location.png">'))
  assert.deepEqual(await resolveLinkMetadata('https://www.google.com/maps/place/Taipei+101/'), { title: 'Taipei 101', description: '', imageUrl: '' })
})

test('shared Not Just Library link recovers its full place and address from redirect', async (t) => {
  const label = '110臺北市信義區新仁里光復南路133號不只是圖書館 Not Just Library'
  t.mock.method(globalThis, 'fetch', async () => {
    const response = new Response('<meta property="og:title" content="Google Maps"><meta property="og:description" content="Find local businesses"><meta property="og:image" content="https://example.com/unrelated-map.png">')
    Object.defineProperty(response, 'url', { value: `https://www.google.com/maps/place/${encodeURIComponent(label)}/data=!4m2` })
    return response
  })
  const url = 'https://maps.app.goo.gl/EHYdfi84qGFML6Hu7?g_st=ac'
  const metadata = await resolveLinkMetadata(url)
  assert.deepEqual(metadata, { title: label, description: '', imageUrl: '' })
  const saved = { id: 'maps', url, title: 'Google Maps', description: 'Find local businesses', imageUrl: 'https://example.com/old-map.png', tags: ['台北'], createdAt: 123 }
  assert.deepEqual(toStoredLink(applyPreviewRefresh(saved, { ...metadata, succeeded: true })), {
    ...saved, ...metadata, metadataVersion: 1
  })
})
