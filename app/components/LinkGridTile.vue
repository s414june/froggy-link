<script setup lang="ts">
defineProps<{ label: string }>()
const emit = defineEmits<{ open: [], actions: [] }>()
let timer: ReturnType<typeof setTimeout> | undefined
let held = false
let moved = false
let startX = 0
let startY = 0
const cancel = () => { clearTimeout(timer); timer = undefined }
const actions = () => {
  cancel()
  if (!held) { held = true; emit('actions') }
}
const down = (event: PointerEvent) => {
  cancel()
  held = false
  moved = false
  startX = event.clientX
  startY = event.clientY
  if (event.button === 0) timer = setTimeout(actions, 500)
}
const move = (event: PointerEvent) => {
  if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) {
    moved = true
    cancel()
  }
}
const open = () => {
  cancel()
  if (!held && !moved) emit('open')
  held = false
  moved = false
}
onBeforeUnmount(cancel)
</script>

<template>
  <button type="button" :aria-label="label" aria-haspopup="dialog" class="grid-tile block aspect-square w-full overflow-hidden bg-white text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
    @pointerdown="down" @pointermove="move" @pointerup="cancel" @pointercancel="cancel" @pointerleave="cancel"
    @click="open" @contextmenu.prevent="actions" @keydown.shift.f10.prevent="held = false; actions()" @keydown.enter="held = false; moved = false" @keydown.space="held = false; moved = false">
    <slot />
  </button>
</template>

<style scoped>
.grid-tile { touch-action: pan-y; user-select: none; -webkit-touch-callout: none; }
.grid-tile :deep(img) { pointer-events: none; -webkit-user-drag: none; }
</style>
