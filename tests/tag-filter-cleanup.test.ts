import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { computed, effectScope, nextTick, ref, watch } from 'vue'
import { createLinkSearch } from '../app/utils/link-search.ts'

const source = readFileSync(new URL('../app/composables/use-links.ts', import.meta.url), 'utf8')
const filterSource = source.slice(source.indexOf('  const selectedTagFilters ='), source.indexOf('  const toggleTagFilter ='))
const setup = () => {
  const scope = effectScope()
  const links = ref([
    { id: 'one', title: 'One', url: 'https://example.com/1', description: '', tags: ['日本'] },
    { id: 'two', title: 'Two', url: 'https://example.com/2', description: '', tags: ['住宿'] }
  ])
  const state = scope.run(() => new Function('ref', 'computed', 'watch', 'links', 'tagOrderMap', 'normalizeTags', 'createLinkSearch',
    stripTypeScriptTypes(filterSource) + ';return { selectedTagFilters, filteredLinks, searchQuery }'
  )(ref, computed, watch, links, ref({}), (tags: string[]) => tags, createLinkSearch))
  return { ...state, links, stop: () => scope.stop() }
}

test('removing the last occurrence of a selected tag restores the whole list', async () => {
  const flow = setup()
  try {
    flow.selectedTagFilters.value = ['日本']
    assert.equal(flow.filteredLinks.value.length, 1)
    flow.links.value[0].tags = []
    await nextTick()
    assert.deepEqual(flow.selectedTagFilters.value, [])
    assert.equal(flow.filteredLinks.value.length, 2)
  } finally { flow.stop() }
})

test('deleting tagged bookmarks removes only stale filters and preserves search', async () => {
  const flow = setup()
  try {
    flow.selectedTagFilters.value = ['日本', '住宿']
    flow.searchQuery.value = 'Two'
    flow.links.value = flow.links.value.filter(item => item.id !== 'one')
    await nextTick()
    assert.deepEqual(flow.selectedTagFilters.value, ['住宿'])
    assert.equal(flow.searchQuery.value, 'Two')
    assert.equal(flow.filteredLinks.value[0].id, 'two')
  } finally { flow.stop() }
})

test('a filter stays active while other bookmarks still have that tag', async () => {
  const flow = setup()
  try {
    flow.links.value[1].tags.push('日本')
    flow.selectedTagFilters.value = ['日本']
    flow.links.value[0].tags = []
    await nextTick()
    assert.deepEqual(flow.selectedTagFilters.value, ['日本'])
    assert.deepEqual(flow.filteredLinks.value.map(item => item.id), ['two'])
  } finally { flow.stop() }
})
