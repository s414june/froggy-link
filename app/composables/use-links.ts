import { linkIdentity } from '~/utils/link-identity'
import { applyPreviewRefresh, applyRepeatedLinkPreview } from '~/utils/preview-refresh'
import type { LocationQuery } from 'vue-router'
import type { LinkItem } from '~/types/link'
import { fetchLinkMetadata } from '~/utils/link-metadata'
import { readAllLinks, removeLink, upsertLink } from '~/utils/link-db'
import { repairLegacyLink } from '~/utils/link-migration'

const normalizeTag = (tag: string) => {
  return tag.trim().replace(/\s+/g, ' ')
}

const TAG_ORDER_STORAGE_KEY = 'froggy-link-tag-order-v1'

const normalizeTags = (tags: string[] | undefined) => {
  if (!Array.isArray(tags)) {
    return []
  }

  const normalized = tags
    .map((tag) => normalizeTag(tag))
    .filter(Boolean)

  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
}

const parseQueryValue = (value: string | string[] | null | undefined) => {
  if (!value) {
    return ''
  }

  return Array.isArray(value) ? value[0] ?? '' : value
}

const extractFirstUrl = (raw: string) => {
  const match = raw.match(/https?:\/\/[^\s]+/i)
  return match?.[0] ?? ''
}

const normalizeUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim()
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  const parsed = new URL(withScheme)
  return parsed.toString()
}

const normalizeStoredLink = (raw: Partial<LinkItem> & Pick<LinkItem, 'id' | 'url' | 'createdAt'>): LinkItem => {
  return {
    id: raw.id,
    url: raw.url,
    title: raw.title ?? raw.url,
    description: raw.description ?? '',
    imageUrl: raw.imageUrl ?? '',
    tags: normalizeTags(raw.tags),
    createdAt: raw.createdAt,
    metadataVersion: raw.metadataVersion
  }
}

export const useLinks = () => {
  const links = ref<LinkItem[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const refreshingIds = ref<string[]>([])
  const errorMessage = ref('')
  const tagOrderMap = ref<Record<string, number>>({})

  const formUrl = ref('')
  const formTagInput = ref('')
  const formTags = ref<string[]>([])

  const selectedTagFilters = ref<string[]>([])

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    for (const link of links.value) {
      for (const tag of normalizeTags(link.tags)) {
        tagSet.add(tag)
      }
    }

    return [...tagSet].sort((a, b) => {
      const aOrder = tagOrderMap.value[a]
      const bOrder = tagOrderMap.value[b]
      const hasAOrder = typeof aOrder === 'number'
      const hasBOrder = typeof bOrder === 'number'

      if (hasAOrder && hasBOrder && aOrder !== bOrder) {
        return bOrder - aOrder
      }
      if (hasAOrder && !hasBOrder) {
        return -1
      }
      if (!hasAOrder && hasBOrder) {
        return 1
      }

      return a.localeCompare(b, 'zh-Hant')
    })
  })

  const filteredLinks = computed(() => {
    if (selectedTagFilters.value.length === 0) {
      return links.value
    }

    return links.value.filter((item) => {
      const tags = normalizeTags(item.tags)
      return selectedTagFilters.value.some((selectedTag) => tags.includes(selectedTag))
    })
  })

  const toggleTagFilter = (tag: string) => {
    if (selectedTagFilters.value.includes(tag)) {
      selectedTagFilters.value = selectedTagFilters.value.filter((item) => item !== tag)
      return
    }

    selectedTagFilters.value = [...selectedTagFilters.value, tag]
  }

  const resetForm = () => {
    formUrl.value = ''
    formTagInput.value = ''
    formTags.value = []
  }

  const loadTagOrderMap = () => {
    if (!import.meta.client) {
      return
    }

    const raw = localStorage.getItem(TAG_ORDER_STORAGE_KEY)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const normalized: Record<string, number> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          normalized[key] = value
        }
      }

      tagOrderMap.value = normalized
    }
    catch {
      tagOrderMap.value = {}
    }
  }

  const saveTagOrderMap = () => {
    if (!import.meta.client) {
      return
    }

    localStorage.setItem(TAG_ORDER_STORAGE_KEY, JSON.stringify(tagOrderMap.value))
  }

  const registerNewTags = (tags: string[]) => {
    const knownTags = new Set(allTags.value)
    let hasChanges = false

    for (const tag of normalizeTags(tags)) {
      if (knownTags.has(tag)) {
        continue
      }
      if (typeof tagOrderMap.value[tag] === 'number') {
        continue
      }

      tagOrderMap.value = {
        ...tagOrderMap.value,
        [tag]: Date.now()
      }
      hasChanges = true
    }

    if (hasChanges) {
      saveTagOrderMap()
    }
  }

  const loadLinks = async () => {
    if (!import.meta.client) {
      return
    }

    loading.value = true
    errorMessage.value = ''

    try {
      const items = await readAllLinks()
      links.value = items.map((item) => repairLegacyLink(normalizeStoredLink(item)))
      for (const item of links.value) {
        if (items.find(raw => raw.id === item.id)?.metadataVersion !== 1) {
          await upsertLink(item)
        }
      }
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '讀取資料失敗。'
    }
    finally {
      loading.value = false
    }
  }

  const addTagToForm = (rawTag: string) => {
    const normalized = normalizeTag(rawTag)
    if (!normalized) {
      return
    }

    if (!formTags.value.includes(normalized)) {
      formTags.value = [...formTags.value, normalized]
    }

    formTagInput.value = ''
  }

  const removeTagFromForm = (tag: string) => {
    formTags.value = formTags.value.filter((item) => item !== tag)
  }

  const saveLink = async () => {
    if (saving.value) {
      return
    }
    errorMessage.value = ''

    if (!formUrl.value.trim()) {
      errorMessage.value = '請先填入連結。'
      return
    }

    let normalizedUrl = ''
    try {
      normalizedUrl = normalizeUrl(formUrl.value)
    }
    catch {
      errorMessage.value = '連結格式不正確，請檢查後再試。'
      return
    }

    const pendingInputTag = normalizeTag(formTagInput.value)
    const inputTags = normalizeTags([
      ...formTags.value,
      ...(pendingInputTag ? [pendingInputTag] : [])
    ])
    registerNewTags(inputTags)
    const identity = linkIdentity(normalizedUrl)
    const existingItem = links.value.find((item) => linkIdentity(item.url) === identity)

    saving.value = true
    try {
      if (existingItem) {
        const mergedTags = normalizeTags([...existingItem.tags, ...inputTags])
        // Re-adding a link also refreshes text saved by older metadata parsers.
        const metadata = await fetchLinkMetadata(normalizedUrl)

        const updatedItem = applyRepeatedLinkPreview(existingItem, metadata, mergedTags)
        await upsertLink(updatedItem)
        links.value = links.value
          .map((item) => (item.id === updatedItem.id ? updatedItem : item))
          .sort((a, b) => b.createdAt - a.createdAt)

        resetForm()
        return 'duplicate' as const
      }

      const metadata = await fetchLinkMetadata(normalizedUrl)
      const parsedUrl = new URL(normalizedUrl)
      const title = metadata.title || parsedUrl.hostname || normalizedUrl
      const description = metadata.description || ''
      const imageUrl = metadata.imageUrl || ''

      const payload: LinkItem = {
        id: crypto.randomUUID(),
        url: normalizedUrl,
        title,
        description,
        imageUrl,
        tags: inputTags,
        createdAt: Date.now(),
        metadataVersion: 1
      }

      await upsertLink(payload)
      links.value = [payload, ...links.value]
      resetForm()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '儲存失敗。'
    }
    finally {
      saving.value = false
    }
  }

  const refreshPreview = async (id: string) => {
    const target = links.value.find(item => item.id === id)
    if (!target || refreshingIds.value.includes(id)) return
    refreshingIds.value = [...refreshingIds.value, id]
    errorMessage.value = ''
    try {
      const metadata = await fetchLinkMetadata(target.url)
      // Use the current record so edits/deletions during the request are respected.
      const current = links.value.find(item => item.id === id)
      if (!current) return
      const updated = applyPreviewRefresh(current, metadata)
      await upsertLink(updated)
      links.value = links.value.map(item => item.id === id ? updated : item)
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新預覽失敗。'
    }
    finally {
      refreshingIds.value = refreshingIds.value.filter(item => item !== id)
    }
  }

  const deleteLink = async (id: string) => {
    errorMessage.value = ''

    try {
      await removeLink(id)
      links.value = links.value.filter((item) => item.id !== id)
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '刪除失敗。'
    }
  }

  const updateLinkTags = async (id: string, tags: string[]) => {
    errorMessage.value = ''

    const target = links.value.find((item) => item.id === id)
    if (!target) {
      return
    }

    const nextTags = normalizeTags(tags)
    registerNewTags(nextTags)
    const updatedItem: LinkItem = {
      ...target,
      tags: nextTags
    }

    try {
      await upsertLink(updatedItem)
      links.value = links.value
        .map((item) => (item.id === id ? updatedItem : item))
        .sort((a, b) => b.createdAt - a.createdAt)
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新標籤失敗。'
    }
  }

  const hydrateFromShareQuery = (query: LocationQuery) => {
    const sharedUrl = parseQueryValue(query.url)
    const sharedText = parseQueryValue(query.text)
    const fallbackUrl = extractFirstUrl(sharedText)
    const targetUrl = sharedUrl || fallbackUrl

    if (targetUrl) {
      formUrl.value = targetUrl
      return true
    }

    return false
  }

  return {
    allTags,
    deleteLink,
    errorMessage,
    filteredLinks,
    formTagInput,
    formTags,
    formUrl,
    hydrateFromShareQuery,
    links,
    loadLinks,
    loading,
    saving,
    refreshingIds,
    refreshPreview,
    addTagToForm,
    removeTagFromForm,
    resetForm,
    saveLink,
    toggleTagFilter,
    updateLinkTags,
    selectedTagFilters,
    loadTagOrderMap
  }
}
