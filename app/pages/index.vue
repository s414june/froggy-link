<script setup lang="ts">
import { useLinks } from '~/composables/use-links'

const {
  canInstall: canInstallPwa,
  showBanner: showInstallBanner,
  isInstalled: isPwaInstalled,
  installing: isInstallingPwa,
  statusMessage: installStatusMessage,
  install: triggerPwaInstall,
  dismiss: dismissInstallBanner
} = useNuxtApp().$pwaInstall

const route = useRoute()
useHead({
  title: '🐸 Froggy Link'
})

const {
  allTags,
  deleteLink,
  errorMessage,
  filteredLinks,
  formTagInput,
  formTags,
  formUrl,
  hydrateFromShareQuery,
  loadLinks,
  loading,
  saving,
  addTagToForm,
  removeTagFromForm,
  saveLink,
  toggleTagFilter,
  updateLinkTags,
  selectedTagFilters,
  loadTagOrderMap
} = useLinks()

const editingId = ref('')
const editTagInput = ref('')
const editTags = ref<string[]>([])
const activeTab = ref<'links' | 'map'>('links')
const isSettingsOpen = ref(false)
const isTagModalOpen = ref(false)
const modalTags = ref<string[]>([])
const modalTagTitle = ref('')
const isTagPickerOpen = ref(false)
const tagPickerTitle = ref('')
const tagPickerMode = ref<'filter' | 'form-known' | 'form-selected'>('filter')
const tagPickerItems = ref<string[]>([])
const shareHintMessage = ref('')
const tagRowRefs = ref<Record<string, HTMLElement | null>>({})
const tagOverflowById = ref<Record<string, boolean>>({})
const formKnownTagsRowRef = ref<HTMLElement | null>(null)
const formSelectedTagsRowRef = ref<HTMLElement | null>(null)
const filterTagsRowRef = ref<HTMLElement | null>(null)
const formKnownTagsOverflow = ref(false)
const formSelectedTagsOverflow = ref(false)
const filterTagsOverflow = ref(false)
let shareHintTimer: ReturnType<typeof window.setTimeout> | null = null

const normalizeTag = (tag: string) => tag.trim().replace(/\s+/g, ' ')

const normalizeTags = (tags: string[]) => {
  const normalized = tags.map((tag) => normalizeTag(tag)).filter(Boolean)
  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
}

const onTagInputKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) {
    return
  }

  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== ',') {
    return
  }

  event.preventDefault()
  addTagToForm(formTagInput.value)
}

const startEdit = (itemId: string, tags: string[]) => {
  editingId.value = itemId
  editTagInput.value = ''
  editTags.value = normalizeTags(tags)
}

const cancelEdit = () => {
  editingId.value = ''
  editTagInput.value = ''
  editTags.value = []
}

const addTagToEdit = (rawTag: string) => {
  const normalized = normalizeTag(rawTag)
  if (!normalized) {
    return
  }

  editTags.value = normalizeTags([...editTags.value, normalized])
  editTagInput.value = ''
}

const removeTagFromEdit = (tag: string) => {
  editTags.value = editTags.value.filter((item) => item !== tag)
}

const onEditTagInputKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) {
    return
  }

  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== ',') {
    return
  }

  event.preventDefault()
  addTagToEdit(editTagInput.value)
}

const saveItemTags = async () => {
  if (!editingId.value) {
    return
  }

  const pendingTag = normalizeTag(editTagInput.value)
  const tags = normalizeTags([
    ...editTags.value,
    ...(pendingTag ? [pendingTag] : [])
  ])

  await updateLinkTags(editingId.value, tags)
  cancelEdit()
}

const deleteInEditMode = async (itemId: string) => {
  await deleteLink(itemId)
  if (editingId.value === itemId) {
    cancelEdit()
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-TW', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const showShareHint = (message: string) => {
  shareHintMessage.value = message
  if (shareHintTimer !== null) {
    window.clearTimeout(shareHintTimer)
  }

  shareHintTimer = window.setTimeout(() => {
    shareHintMessage.value = ''
    shareHintTimer = null
  }, 5000)
}

const setTagRowRef = (id: string, el: Element | null) => {
  tagRowRefs.value[id] = el instanceof HTMLElement ? el : null
}

const updateTagOverflow = () => {
  formKnownTagsOverflow.value = !!formKnownTagsRowRef.value
    && formKnownTagsRowRef.value.scrollWidth > formKnownTagsRowRef.value.clientWidth + 1
  formSelectedTagsOverflow.value = !!formSelectedTagsRowRef.value
    && formSelectedTagsRowRef.value.scrollWidth > formSelectedTagsRowRef.value.clientWidth + 1
  filterTagsOverflow.value = !!filterTagsRowRef.value
    && filterTagsRowRef.value.scrollWidth > filterTagsRowRef.value.clientWidth + 1

  const nextMap: Record<string, boolean> = {}
  for (const item of filteredLinks.value) {
    const row = tagRowRefs.value[item.id]
    nextMap[item.id] = !!row && row.scrollWidth > row.clientWidth + 1
  }
  tagOverflowById.value = nextMap
}

const openAllTagsModal = (title: string, tags: string[]) => {
  modalTagTitle.value = title
  modalTags.value = [...tags]
  isTagModalOpen.value = true
}

const openTagPicker = (mode: 'filter' | 'form-known' | 'form-selected') => {
  tagPickerMode.value = mode
  if (mode === 'filter') {
    tagPickerTitle.value = '篩選標籤'
    tagPickerItems.value = [...allTags.value]
  }
  else if (mode === 'form-known') {
    tagPickerTitle.value = '新增區標籤'
    tagPickerItems.value = [...allTags.value]
  }
  else {
    tagPickerTitle.value = '已選標籤'
    tagPickerItems.value = [...formTags.value]
  }

  isTagPickerOpen.value = true
}

const isTagPickerItemActive = (tag: string) => {
  if (tagPickerMode.value === 'filter') {
    return selectedTagFilters.value.includes(tag)
  }

  return formTags.value.includes(tag)
}

const onTagPickerItemClick = (tag: string) => {
  if (tagPickerMode.value === 'filter') {
    toggleTagFilter(tag)
    return
  }

  if (formTags.value.includes(tag)) {
    removeTagFromForm(tag)
  }
  else {
    addTagToForm(tag)
  }
}

watch([filteredLinks, allTags, formTags, selectedTagFilters], async () => {
  await nextTick()
  updateTagOverflow()
}, { deep: true })

const receiveSharedLink = async () => {
  if (!hydrateFromShareQuery(route.query)) {
    return
  }

  const query = { ...route.query }
  delete query.url
  delete query.text
  delete query.title
  await navigateTo({ path: route.path, query, hash: route.hash }, { replace: true })
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  showShareHint('設定標籤並按下新增！')
}

watch(() => route.query, () => {
  if (import.meta.client) {
    void receiveSharedLink()
  }
})

onMounted(async () => {
  loadTagOrderMap()
  window.addEventListener('resize', updateTagOverflow)
  await loadLinks()
  await receiveSharedLink()
  await nextTick()
  updateTagOverflow()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTagOverflow)
  if (shareHintTimer !== null) {
    window.clearTimeout(shareHintTimer)
  }
})
</script>

<template>
  <main class="min-h-screen bg-bg text-text">
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6">
      <header class="flex items-center justify-between gap-3">
        <h1 class="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <img src="/icons/icon-192.png" alt="" width="40" height="40" class="h-10 w-10 shrink-0">
          Froggy Link
        </h1>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-[#000000] bg-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-200"
          @click="isSettingsOpen = true"
        >
          設定
        </button>
      </header>

      <section
        v-if="showInstallBanner"
        aria-labelledby="install-banner-title"
        class="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
      >
        <img src="/icons/icon-192.png" alt="" width="48" height="48" class="h-12 w-12 shrink-0 rounded-xl">
        <div class="min-w-0 flex-1">
          <h2 id="install-banner-title" class="font-semibold text-slate-900">安裝 Froggy Link App</h2>
          <p class="mt-1 text-sm text-slate-600">加到主畫面，隨時收藏連結，也能從其他 App 分享至這裡。</p>
        </div>
        <div class="flex w-full justify-end gap-2 sm:w-auto">
          <button type="button" class="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" @click="dismissInstallBanner">
            暫時不要
          </button>
          <button type="button" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover" @click="triggerPwaInstall">
            安裝 App
          </button>
        </div>
      </section>
      <p v-if="installStatusMessage && !isSettingsOpen" role="status" class="text-sm text-slate-600">
        {{ installStatusMessage }}
      </p>

      <section class="rounded-xl border border-[#000000] bg-surface p-4 shadow-sm md:p-5">
        <form class="space-y-4" @submit.prevent="saveLink">
          <div class="space-y-1">
            <input
              id="url-input"
              v-model="formUrl"
              type="url"
              required
              placeholder="https://example.com"
              class="w-full rounded-lg border border-slate-300 bg-surface-soft px-3 py-2 text-sm outline-none focus:border-primary"
            >
          </div>
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <div
                ref="formKnownTagsRowRef"
                class="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-hidden"
              >
                <button
                  v-for="tag in allTags"
                  :key="`known-${tag}`"
                  type="button"
                  class="shrink-0 rounded-full border px-2 py-1 text-xs transition"
                  :class="formTags.includes(tag)
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-slate-300 text-slate-700 hover:border-primary'"
                  @click="formTags.includes(tag) ? removeTagFromForm(tag) : addTagToForm(tag)"
                >
                  {{ tag }}
                </button>
              </div>
              <button
                v-if="formKnownTagsOverflow"
                type="button"
                class="shrink-0 px-1 text-xs text-slate-600 hover:text-slate-900"
                @click="openTagPicker('form-known')"
              >
                ...
              </button>
            </div>

            <div class="flex gap-2">
              <input
                id="tag-input"
                v-model="formTagInput"
                type="text"
                placeholder="輸入標籤後按 Enter 或空白"
                class="w-full rounded-lg border border-slate-300 bg-surface-soft px-3 py-2 text-sm outline-none focus:border-primary"
                @keydown="onTagInputKeydown"
              >
            </div>

            <div class="flex items-center gap-2">
              <div
                ref="formSelectedTagsRowRef"
                class="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-hidden"
              >
                <span
                  v-for="tag in formTags"
                  :key="`selected-${tag}`"
                  class="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs text-primary"
                >
                  {{ tag }}
                  <button
                    type="button"
                    class="font-bold leading-none"
                    @click="removeTagFromForm(tag)"
                  >
                    ×
                  </button>
                </span>
              </div>
              <button
                v-if="formSelectedTagsOverflow"
                type="button"
                class="shrink-0 px-1 text-xs text-slate-600 hover:text-slate-900"
                @click="openTagPicker('form-selected')"
              >
                ...
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="saving"
            class="shrink-0 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
            :class="saving ? 'cursor-not-allowed opacity-60' : ''"
          >
            {{ saving ? '抓取資訊中...' : '新增' }}
          </button>
        </form>
      </section>

      <div class="flex h-[calc(100dvh-3rem)] min-h-[420px] flex-col space-y-0">
        <div class="-mb-px flex items-end gap-2">
          <button
            type="button"
            class="relative shrink-0 whitespace-nowrap rounded-t-lg border border-[#000000] border-b-0 px-3 py-2 text-sm transition"
            :class="activeTab === 'links'
              ? 'relative z-10 border-b-surface bg-surface text-primary'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeTab = 'links'"
          >
            連結清單
            <span
              v-if="activeTab === 'links'"
              class="pointer-events-none absolute -bottom-px left-0 right-0 h-[2px] bg-surface"
            />
          </button>
          <button
            type="button"
            class="relative shrink-0 whitespace-nowrap rounded-t-lg border border-[#000000] border-b-0 px-3 py-2 text-sm transition"
            :class="activeTab === 'map'
              ? 'relative z-10 border-b-surface bg-surface text-primary'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="activeTab = 'map'"
          >
            地圖點位
            <span
              v-if="activeTab === 'map'"
              class="pointer-events-none absolute -bottom-px left-0 right-0 h-[2px] bg-surface"
            />
          </button>
        </div>

        <section class="flex min-h-0 flex-1 flex-col rounded-b-xl rounded-tr-xl rounded-tl-none border border-[#000000] bg-surface p-4 shadow-sm md:p-5">
        <template v-if="activeTab === 'links'">
          <div class="mb-4 flex items-center gap-2">
            <div
              ref="filterTagsRowRef"
              class="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden"
            >
              <button
                v-for="tag in allTags"
                :key="`filter-${tag}`"
                class="shrink-0 rounded-full border px-3 py-1 text-xs transition"
                :class="selectedTagFilters.includes(tag)
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-slate-300 text-slate-700 hover:border-primary'"
                @click="toggleTagFilter(tag)"
              >
                {{ tag }}
              </button>
            </div>
            <button
              v-if="filterTagsOverflow"
              type="button"
              class="shrink-0 px-1 text-xs text-slate-600 hover:text-slate-900"
              @click="openTagPicker('filter')"
            >
              ...
            </button>
          </div>

          <p v-if="errorMessage" class="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {{ errorMessage }}
          </p>

          <p v-if="loading" class="text-sm text-muted">
            載入中...
          </p>

          <ul v-else-if="filteredLinks.length > 0" class="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 min-[480px]:grid-cols-2">
            <li
              v-for="item in filteredLinks"
              :key="item.id"
              class="rounded-lg border border-slate-300 bg-surface-soft p-3"
            >
              <div class="min-w-0 space-y-1">
                <div class="flex items-start justify-between gap-3">
                  <a
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="break-all text-base font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {{ item.title }}
                  </a>
                  <button
                    type="button"
                    class="shrink-0 whitespace-nowrap rounded-md bg-slate-200 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-300"
                    @click="editingId === item.id ? cancelEdit() : startEdit(item.id, item.tags)"
                  >
                    {{ editingId === item.id ? '取消' : '編輯' }}
                  </button>
                </div>
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  alt="連結預覽圖"
                  class="mt-2 aspect-square w-full rounded-md border border-slate-200 bg-white object-contain p-1"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                >
                <p class="break-all text-xs text-muted">
                  {{ item.url }}
                </p>
                <p v-if="item.description" class="text-sm text-slate-700">
                  {{ item.description }}
                </p>
                <div class="mt-2 flex items-center gap-2">
                  <div
                    :ref="(el) => setTagRowRef(item.id, el)"
                    class="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-hidden"
                  >
                    <span
                      v-for="tag in item.tags"
                      :key="`${item.id}-${tag}`"
                      class="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <button
                    v-if="tagOverflowById[item.id]"
                    type="button"
                    class="shrink-0 px-1 text-xs text-slate-600 hover:text-slate-900"
                    @click="openAllTagsModal(item.title, item.tags)"
                  >
                    ...
                  </button>
                </div>
                <p class="text-xs text-muted">
                  建立時間：{{ formatDate(item.createdAt) }}
                </p>
              </div>

              <div
                v-if="editingId === item.id"
                class="mt-3 space-y-3 rounded-md border border-[#000000] bg-slate-50 p-3"
              >
                <div class="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                  <span
                    v-for="tag in editTags"
                    :key="`${item.id}-edit-${tag}`"
                    class="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary bg-primary/10 px-2 py-1 text-xs text-primary"
                  >
                    {{ tag }}
                    <button
                      type="button"
                      class="font-bold leading-none"
                      @click="removeTagFromEdit(tag)"
                    >
                      ×
                    </button>
                  </span>
                </div>

                <input
                  v-model="editTagInput"
                  type="text"
                  placeholder="輸入標籤後按 Enter 或空白"
                  class="w-full rounded-lg border border-slate-300 bg-surface-soft px-3 py-2 text-sm outline-none focus:border-primary"
                  @keydown="onEditTagInputKeydown"
                >

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="shrink-0 whitespace-nowrap rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition hover:bg-primary-hover"
                    @click="saveItemTags"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    class="shrink-0 whitespace-nowrap rounded-md border border-red-600 bg-red-50 px-3 py-1 text-xs text-red-700 transition hover:bg-red-100"
                    @click="deleteInEditMode(item.id)"
                  >
                    刪除連結
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <p v-else class="text-sm text-muted">
            尚未有連結，先貼上一筆並加上標籤吧。
          </p>
        </template>

        <div
          v-else
          class="h-full overflow-y-auto rounded-lg border border-dashed border-[#000000] bg-surface p-4"
        >
          <h2 class="text-base font-semibold">
            地圖點位（預留）
          </h2>
          <p class="mt-1 text-sm text-muted">
            已預留資料結構與介面位置，後續可在連結資料上補上地圖座標欄位並接入地圖元件。
          </p>
        </div>
        </section>
      </div>
    </div>

    <div
      v-if="isSettingsOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      @click.self="isSettingsOpen = false"
    >
      <div class="w-full max-w-sm rounded-xl border border-[#000000] bg-white p-4 shadow-lg">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-900">
            設定
          </h2>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="isSettingsOpen = false"
          >
            ❌
          </button>
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100"
          :disabled="isInstallingPwa || isPwaInstalled"
          @click="triggerPwaInstall"
        >
          <span>加到主畫面</span>
          <span
            class="ml-2 text-xs"
            :class="canInstallPwa ? 'text-green-700' : 'text-slate-500'"
          >
            {{ isPwaInstalled ? '已安裝' : isInstallingPwa ? '安裝中…' : canInstallPwa ? '可安裝' : '查看方式' }}
          </span>
        </button>

        <p v-if="installStatusMessage" role="status" class="mt-3 text-xs text-slate-600">
          {{ installStatusMessage }}
        </p>
      </div>
    </div>

    <div
      v-if="isTagModalOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      @click.self="isTagModalOpen = false"
    >
      <div class="w-full max-w-sm rounded-xl border border-[#000000] bg-white p-4 shadow-lg">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="line-clamp-1 text-base font-semibold text-slate-900">
            {{ modalTagTitle }}
          </h2>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="isTagModalOpen = false"
          >
            ❌
          </button>
        </div>

        <div class="flex max-h-72 flex-nowrap gap-2 overflow-x-auto overflow-y-auto pr-1">
          <span
            v-for="tag in modalTags"
            :key="`modal-${tag}`"
            class="shrink-0 rounded-full border border-primary bg-primary/10 px-2 py-1 text-xs text-primary"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-if="isTagPickerOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4"
      @click.self="isTagPickerOpen = false"
    >
      <div class="w-full max-w-sm rounded-xl border border-[#000000] bg-white p-4 shadow-lg">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="line-clamp-1 text-base font-semibold text-slate-900">
            {{ tagPickerTitle }}
          </h2>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="isTagPickerOpen = false"
          >
            ❌
          </button>
        </div>

        <div class="max-h-72 overflow-y-auto pr-1">
          <p v-if="tagPickerItems.length === 0" class="text-sm text-slate-500">
            目前沒有標籤
          </p>
          <div v-else class="flex flex-wrap gap-2">
            <button
              v-for="tag in tagPickerItems"
              :key="`picker-${tag}`"
              type="button"
              class="rounded-full border px-3 py-1 text-xs transition"
              :class="isTagPickerItemActive(tag)
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-slate-300 text-slate-700 hover:border-primary'"
              @click="onTagPickerItemClick(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="shareHintMessage"
      class="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <p class="rounded-lg border border-[#000000] bg-slate-900/95 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg">
        {{ shareHintMessage }}
      </p>
    </div>
  </main>
</template>
