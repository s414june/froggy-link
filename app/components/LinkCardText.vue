<script setup lang="ts">
import { linkDisplayText } from '~/utils/link-display'

const props = defineProps<{ url: string, title: string, description: string }>()
const text = computed(() => linkDisplayText(props.url, props.title, props.description))
const expanded = ref(false)
const titleBox = ref<HTMLElement>()
const urlBox = ref<HTMLElement>()
const urlOverflow = ref(false)
const descriptionBox = ref<HTMLElement>()
const titleOverflow = ref(false)
const descriptionOverflow = ref(false)
const overflowing = computed(() => titleOverflow.value || descriptionOverflow.value || urlOverflow.value)
const contentId = useId()
let observer: ResizeObserver | undefined
const measure = () => {
  if (expanded.value) return
  urlOverflow.value = !!urlBox.value && urlBox.value.scrollHeight > urlBox.value.clientHeight + 1
  titleOverflow.value = !!titleBox.value && titleBox.value.scrollHeight > titleBox.value.clientHeight + 1
  descriptionOverflow.value = !!descriptionBox.value && descriptionBox.value.scrollHeight > descriptionBox.value.clientHeight + 1
}
watch(text, async () => {
  expanded.value = false
  await nextTick()
  measure()
})
const toggle = async () => {
  expanded.value = !expanded.value
  await nextTick()
  measure()
}
onMounted(() => {
  observer = new ResizeObserver(measure)
  if (titleBox.value) observer.observe(titleBox.value)
  if (urlBox.value) observer.observe(urlBox.value)
  if (descriptionBox.value) observer.observe(descriptionBox.value)
  window.addEventListener('resize', measure)
  measure()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <div :id="contentId" class="min-w-0 space-y-1">
    <div class="flex items-start justify-between gap-3">
      <div ref="titleBox" class="min-w-0 break-words [overflow-wrap:anywhere]" :class="{ 'collapsed-title': !expanded, 'faded-text': !expanded && titleOverflow }">
        <a :href="url" target="_blank" rel="noopener noreferrer" class="text-base font-semibold text-primary underline-offset-2 hover:underline">{{ text.title || url }}</a>
      </div>
      <slot name="edit" />
    </div>
    <slot />
    <p ref="urlBox" class="break-all text-xs text-muted" :class="{ 'collapsed-url': !expanded, 'faded-text': !expanded && urlOverflow }">{{ url }}</p>
    <div ref="descriptionBox" :class="{ 'collapsed-text': !expanded, 'faded-text': !expanded && descriptionOverflow }">
      <p v-if="text.description" class="whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm text-slate-700">{{ text.description }}</p>
    </div>
    <button v-if="overflowing || expanded" type="button" :aria-expanded="expanded" :aria-controls="contentId" class="rounded-md py-2 text-sm font-medium text-primary underline underline-offset-2" @click="toggle">{{ expanded ? '收合內容' : '展開全文' }}</button>
  </div>
</template>

<style scoped>
.collapsed-url { max-height: 10dvh; overflow: hidden; }
.collapsed-title { max-height: 20dvh; overflow: hidden; }
.collapsed-text { max-height: 30dvh; overflow: hidden; }
.faded-text { mask-image: linear-gradient(to bottom, #000 calc(100% - 2rem), transparent); }
</style>
