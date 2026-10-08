<script setup lang="ts">
const props = defineProps<{ url: string }>()
const emit = defineEmits<{ close: [], notice: [message: string] }>()
const dialog = ref<HTMLDialogElement>()
const canCopy = ref(false)
const canShare = ref(false)
const close = () => dialog.value?.close()
const copy = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    close()
    emit('notice', '已複製連結網址！')
  }
  catch { emit('notice', '目前無法複製連結網址。') }
}
const share = async (url: string) => {
  try {
    await navigator.share({ url })
    close()
  }
  catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) emit('notice', '目前無法分享連結網址。')
  }
}
onMounted(() => {
  canCopy.value = typeof navigator.clipboard?.writeText === 'function'
  canShare.value = typeof navigator.share === 'function'
    && (typeof navigator.canShare !== 'function' || navigator.canShare({ url: props.url }))
  dialog.value?.showModal()
})
</script>

<template>
  <dialog ref="dialog" class="link-actions rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl" aria-label="連結選單" @close="emit('close')" @click="event => { if (event.target === dialog) close() }">
    <a :href="url" target="_blank" rel="noopener noreferrer" class="block rounded-lg px-5 py-3 hover:bg-slate-100" @click="close">開啟連結</a>
    <button v-if="canCopy" type="button" class="block w-full rounded-lg px-5 py-3 text-left hover:bg-slate-100" @click="copy(url)">複製連結網址</button>
    <button v-if="canShare" type="button" class="block w-full rounded-lg px-5 py-3 text-left hover:bg-slate-100" @click="share(url)">分享連結網址</button>
  </dialog>
</template>

<style scoped>
.link-actions { width: min(20rem, calc(100vw - 2rem)); }
.link-actions::backdrop { background: rgb(0 0 0 / 30%); }
</style>
