import type { LinkItem } from '../types/link.ts'

interface PreviewResult {
  title: string
  description: string
  imageUrl: string
  succeeded: boolean
}

export const applyPreviewRefresh = (current: LinkItem, metadata: PreviewResult): LinkItem => {
  let obsoleteScreenshot = false
  try { obsoleteScreenshot = new URL(current.imageUrl).hostname === 'image.thum.io' }
  catch { /* No legacy screenshot. */ }
  if (!metadata.succeeded || (!metadata.title && !metadata.description && !metadata.imageUrl && !obsoleteScreenshot)) {
    throw new Error('目前無法取得預覽，請稍後再試。原有收藏已保留。')
  }
  return {
    ...current,
    title: metadata.title,
    // A successful preview may intentionally have no description.
    description: metadata.description,
    // Empty is an intentional result, not a reason to restore an old screenshot.
    imageUrl: metadata.imageUrl,
    metadataVersion: 1
  }
}


// Re-adding can still merge tags if the preview is unavailable, but uses the
// exact same replacement rules as the explicit refresh whenever it succeeds.
export const applyRepeatedLinkPreview = (current: LinkItem, metadata: PreviewResult, tags: string[]): LinkItem => {
  let updated = current
  try { updated = applyPreviewRefresh(current, metadata) }
  catch { /* Retain the preview while allowing the user's tags to be saved. */ }
  return { ...updated, tags }
}
