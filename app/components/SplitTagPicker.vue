<script setup lang="ts">
const props = defineProps<{ tags: string[], selected: string[], label: string }>()
const emit = defineEmits<{ toggle: [tag: string], more: [] }>()
const selectedTags = computed(() => props.selected.filter(tag => props.tags.includes(tag)))
const availableTags = computed(() => props.tags.filter(tag => !props.selected.includes(tag)))
const selectedRow = ref<HTMLElement>()
const availableRow = ref<HTMLElement>()
const overflow = ref(false)
let observer: ResizeObserver | undefined
const measure = () => {
  overflow.value = [selectedRow.value, availableRow.value].some(row => row && row.scrollWidth > row.clientWidth + 1)
}
const observeRows = () => {
  observer?.disconnect()
  for (const row of [selectedRow.value, availableRow.value]) if (row) observer?.observe(row)
  measure()
}
watch([selectedTags, availableTags], async ([selected], [previous]) => {
  await nextTick()
  observeRows()
  if (selected.some(tag => !previous.includes(tag)) && selectedRow.value) {
    // Only move the selected strip; keep the available strip's scroll position.
    selectedRow.value.scrollLeft = selectedRow.value.scrollWidth
  }
})
onMounted(() => { observer = new ResizeObserver(measure); observeRows() })
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="flex min-w-0 flex-1 items-center gap-2" :aria-label="label">
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <div v-if="selectedTags.length" ref="selectedRow" role="group" :aria-label="`${label}：已選`" class="selected-strip flex min-w-0 shrink items-center gap-2 overflow-x-auto border-r border-slate-200 py-1 pr-2">
        <button v-for="tag in selectedTags" :key="tag" type="button" aria-pressed="true" class="shrink-0 whitespace-nowrap rounded-full border border-primary bg-primary/20 px-3 py-1 text-xs text-primary" @click="emit('toggle', tag)">{{ tag }}</button>
      </div>
      <div ref="availableRow" role="group" :aria-label="`${label}：未選`" class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        <button v-for="tag in availableTags" :key="tag" type="button" aria-pressed="false" class="shrink-0 whitespace-nowrap rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:border-primary" @click="emit('toggle', tag)">{{ tag }}</button>
      </div>
    </div>
    <button v-if="overflow" type="button" :aria-label="`查看全部${label}`" class="shrink-0 px-1 text-xs text-slate-600 hover:text-slate-900" @click="emit('more')">...</button>
  </div>
</template>

<style scoped>
.selected-strip { flex-basis: auto; max-width: calc((100% - .5rem) / 2); }
</style>
