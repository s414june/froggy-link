import type { LinkItem } from '../types/link.ts'

// IndexedDB cannot clone Vue proxies. Copy the persisted fields explicitly,
// including tags: spreading the outer object alone leaves a reactive array.
export const toStoredLink = (link: LinkItem): LinkItem => ({
  id: link.id,
  url: link.url,
  title: link.title,
  description: link.description,
  imageUrl: link.imageUrl,
  tags: Array.from(link.tags),
  createdAt: link.createdAt,
  ...(link.metadataVersion === undefined ? {} : { metadataVersion: link.metadataVersion })
})
