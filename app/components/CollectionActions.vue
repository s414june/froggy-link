<script setup lang="ts">
defineProps<{ grid: boolean }>()
const emit = defineEmits<{ select: [], toggleView: [] }>()
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const panelId = useId()
const dismiss = (event: PointerEvent) => {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
const escape = () => {
  open.value = false
  trigger.value?.focus()
}
const choose = (action: 'select' | 'toggleView') => {
  open.value = false
  if (action === 'select') emit('select')
  else emit('toggleView')
}
onMounted(() => document.addEventListener('pointerdown', dismiss))
onBeforeUnmount(() => document.removeEventListener('pointerdown', dismiss))
</script>

<template>
  <div ref="root" class="relative" @keydown.esc.prevent="escape" @focusout="event => { if (!root?.contains(event.relatedTarget as Node)) open = false }">
    <button ref="trigger" type="button" class="rounded-md border border-black bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50" :aria-expanded="open" :aria-controls="panelId" @click="open = !open">功能</button>
    <div v-if="open" :id="panelId" class="absolute right-0 top-full z-50 mt-2 min-w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      <button type="button" class="block w-full rounded-md px-3 py-3 text-left text-sm hover:bg-slate-100" @click="choose('select')">多選</button>
      <button type="button" class="block w-full whitespace-nowrap rounded-md px-3 py-3 text-left text-sm hover:bg-slate-100" @click="choose('toggleView')">{{ grid ? '清單檢視' : '格子預覽' }}</button>
    </div>
  </div>
</template>
