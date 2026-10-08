<script setup lang="ts">
import { previewText } from '~/utils/preview-text'

const props = defineProps<{ description: string, title: string, url: string, compact?: boolean }>()
const snippet = computed(() => previewText(props.description, props.title, props.url))
</script>

<template>
  <div class="text-preview" :class="{ compact }" role="img" :aria-label="snippet.text">
    <div class="text-preview-grid" aria-hidden="true">
      <span v-for="(character, index) in snippet.characters" :key="index" :class="{ wide: character.wide, ellipsis: character.text === '...' }">{{ character.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.text-preview {
  container-type: inline-size;
  display: flex;
  align-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f0fdf4;
  color: #166534;
  --preview-padding: 1.25rem;
}
.text-preview-grid {
  display: grid;
  width: 100%;
  box-sizing: border-box;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  /* Ten full-width characters per row; the eleventh row reserves room for ... */
  grid-auto-rows: calc((100cqw - 2 * var(--preview-padding)) / 11);
  padding: var(--preview-padding);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: calc((100cqw - 2 * var(--preview-padding)) / 11);
  line-height: 1;
}
.text-preview-grid span {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  white-space: pre;
  font-size: .85em;
}
.text-preview-grid .wide { grid-column: span 2; font-size: 1em; }
.text-preview-grid .ellipsis { grid-column: span 3; }
@media (width >= 1024px) {
  .text-preview { --preview-padding: 1.5rem; }
}
.text-preview.compact { --preview-padding: .375rem; }
</style>
