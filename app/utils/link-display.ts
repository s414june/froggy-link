import { instagramDisplayText } from './instagram.ts'

export const linkDisplayText = (url: string, title: string, description: string) => {
  const text = instagramDisplayText(url, title, description)
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
  const heading = normalize(text.title)
  const body = normalize(text.description)
  if (!heading || !body) return text
  let fallback = '連結'
  try { fallback = new URL(url).hostname.replace(/^www\./, '') }
  catch { /* Keep a readable label for legacy invalid URLs. */ }
  if (heading === body) return { ...text, title: fallback }

  // Strip an entire duplicated body, preserving an identifiable title prefix
  // or suffix. Do not remove short words merely shared by both fields.
  if (body.length >= 20 && heading.includes(body)) {
    const remaining = heading.replace(body, '').replace(/^[\s:：|｜—–\-"“”]+|[\s:：|｜—–\-"“”]+$/g, '').trim()
    return { ...text, title: remaining || fallback }
  }
  // A long caption used verbatim as the title is not a useful heading.
  // Short summaries are intentionally kept, even if they introduce the body.
  if (heading.length >= 80 && body.includes(heading)) return { ...text, title: fallback }
  return text
}
