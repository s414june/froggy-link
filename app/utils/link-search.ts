import type { LinkItem } from '../types/link.ts'
import { linkDisplayText } from './link-display.ts'

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('zh-TW')

// Every space-separated term must match, but terms may match different fields.
export const createLinkSearch = (query: string) => {
  const terms = normalize(query).trim().split(/\s+/u).filter(Boolean)
  return (item: LinkItem) => {
    if (!terms.length) return true
    let readableUrl = item.url
    try { readableUrl = decodeURIComponent(item.url) }
    catch { /* Keep the original URL when an escape sequence is invalid. */ }
    const displayed = linkDisplayText(item.url, item.title, item.description)
    const fields = [item.title, item.description, displayed.title, displayed.description, item.url, readableUrl, ...item.tags].map(normalize)
    return terms.every(term => fields.some(field => field.includes(term)))
  }
}
