import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

// Execute the actual tile's script with a controlled clock, without needing a
// browser to hold a pointer down. Browser checks cover the resulting views.
const source = readFileSync(new URL('../app/components/LinkGridTile.vue', import.meta.url), 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!
const makeTile = () => {
  const events: string[] = []
  let pending: (() => void) | undefined
  let dispose = () => {}
  const setup = new Function('defineProps', 'defineEmits', 'onBeforeUnmount', 'setTimeout', 'clearTimeout',
    stripTypeScriptTypes(source) + '\nreturn { down, move, cancel, open, actions }')
  const tile = setup(() => {}, () => (name: string) => events.push(name), (fn: () => void) => { dispose = fn },
    (fn: () => void, delay: number) => { assert.equal(delay, 500); pending = fn; return 1 },
    () => { pending = undefined })
  return { tile, events, hold: () => pending?.(), dispose: () => dispose() }
}
const point = (x = 0, y = 0) => ({ button: 0, clientX: x, clientY: y })

test('tap opens detail, long press opens actions without also opening detail', () => {
  const { tile, events, hold } = makeTile()
  tile.down(point()); tile.cancel(); tile.open()
  assert.deepEqual(events, ['open'])
  tile.down(point()); hold(); tile.cancel(); tile.open()
  assert.deepEqual(events, ['open', 'actions'])
})
test('scrolling cancels long press and suppresses the following click', () => {
  const { tile, events, hold } = makeTile()
  tile.down(point()); tile.move(point(0, 30)); hold(); tile.open()
  assert.deepEqual(events, [])
})
test('pointer cancellation and unmount clear pending long presses', () => {
  const { tile, events, hold, dispose } = makeTile()
  tile.down(point()); tile.cancel(); hold()
  tile.down(point()); dispose(); hold()
  assert.deepEqual(events, [])
})
test('native context menu after long press does not emit twice', () => {
  const { tile, events, hold } = makeTile()
  tile.down(point()); hold(); tile.actions()
  assert.deepEqual(events, ['actions'])
})
