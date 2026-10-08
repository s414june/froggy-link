import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previewText } from '../app/utils/preview-text.ts'

test('preview uses description first line, then title, then URL', () => {
  assert.equal(previewText(' 第一行\r\n第二行', '標題', 'https://example.com').text, '第一行')
  assert.equal(previewText(' \n ', '標題\n其他', 'https://example.com').text, '標題')
  assert.equal(previewText('', ' ', 'https://example.com').text, 'https://example.com')
})
test('limits are 99 full-width or 198 half-width characters plus ellipsis', () => {
  for (const [character, limit] of [['中', 99], ['あ', 99], ['한', 99], ['Ａ', 99], ['W', 198]] as const) {
    assert.equal(previewText(character.repeat(limit), '', '').text, character.repeat(limit))
    assert.equal(previewText(character.repeat(limit + 1), '', '').text, character.repeat(limit) + '...')
  }
})
test('mixed scripts and grapheme clusters are not split', () => {
  assert.equal(previewText('中'.repeat(98) + 'ab多', '', '').text, '中'.repeat(98) + 'ab...')
  assert.equal(previewText('👩‍👩‍👧‍👦'.repeat(100), '', '').characters.length, 100)
  assert.equal(previewText('e\u0301'.repeat(199), '', '').text, 'e\u0301'.repeat(198) + '...')
})
