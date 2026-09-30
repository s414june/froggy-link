import { decodeHTML } from 'entities'
import type { LinkItem } from '../types/link.ts'

// Old releases decoded named entities but left numeric references in saved text.
// Mark repaired records so literal entity text from the current parser stays intact.
export const repairLegacyLink = (item: LinkItem): LinkItem => {
  if (item.metadataVersion === 1) return item
  const decodeNumeric = (value: string) => value.replace(/&#(?:x[0-9a-f]+|\d+);/gi, entity => decodeHTML(entity))
  return {
    ...item,
    title: decodeNumeric(item.title),
    description: decodeNumeric(item.description),
    metadataVersion: 1
  }
}
