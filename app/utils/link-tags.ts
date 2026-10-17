import type { LinkItem } from '../types/link.ts'

export const appendLinkTag = (item: LinkItem, input: string): LinkItem => {
  const tag = input.trim().replace(/\s+/g, ' ')
  if (!tag || item.tags.includes(tag)) return item
  return { ...item, tags: [...item.tags, tag].sort((a, b) => a.localeCompare(b, 'zh-Hant')) }
}

export const removeLinkTags = (item: LinkItem, tags: string[]): LinkItem => {
  const removed = new Set(tags)
  const remaining = item.tags.filter(tag => !removed.has(tag))
  return remaining.length === item.tags.length ? item : { ...item, tags: remaining }
}
