import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkIdentity } from '../app/utils/link-identity.ts'

test('normalizes URLs and tracking queries without changing the stored URL', () => {
  assert.equal(linkIdentity(' example.com '), linkIdentity('https://example.com/?utm_source=share'))
  assert.equal(linkIdentity('https://example.com/?b=2&a=1&fbclid=abc'), linkIdentity('https://example.com/?a=1&b=2'))
})
test('recognizes repeated social and Maps shares', () => {
  assert.equal(linkIdentity('https://www.instagram.com/p/DdtfZHRkvrW/?stkn=aaa'), linkIdentity('https://www.instagram.com/p/DdtfZHRkvrW/?igsh=bbb'))
  assert.equal(linkIdentity('https://maps.app.goo.gl/EHYdfi84qGFML6Hu7?g_st=ac'), linkIdentity('https://maps.app.goo.gl/EHYdfi84qGFML6Hu7'))
  assert.equal(linkIdentity('https://www.threads.net/@user/post/abc?xmt=one'), linkIdentity('https://www.threads.com/@user/post/abc/?xmt=two&slof=1'))
  assert.equal(linkIdentity('https://youtu.be/abcdefghijk?si=aaa'), linkIdentity('https://www.youtube.com/watch?v=abcdefghijk&feature=shared'))
  assert.equal(linkIdentity('https://www.youtube.com/shorts/abcdefghijk'), linkIdentity('https://www.youtube.com/watch?v=abcdefghijk'))
})
test('keeps distinct content, fragments, timestamps, playlists and unknown query values', () => {
  for (const [a, b] of [
    ['https://example.com/?id=1', 'https://example.com/?id=2'],
    ['https://example.com/#/one', 'https://example.com/#/two'],
    ['https://youtu.be/abcdefghijk?t=10', 'https://youtu.be/abcdefghijk?t=20'],
    ['https://www.youtube.com/watch?v=abcdefghijk&list=one', 'https://www.youtube.com/watch?v=abcdefghijk&list=two'],
    ['https://maps.app.goo.gl/one', 'https://maps.app.goo.gl/two'],
    ['https://example.com/Page', 'https://example.com/page'],
    ['https://www.instagram.com/p/abc/?img_index=1', 'https://www.instagram.com/p/abc/?img_index=2']
  ]) assert.notEqual(linkIdentity(a!), linkIdentity(b!))
})
