import { instagramDisplayText } from './instagram.ts'

export const linkDisplayText = (url: string, title: string, description: string) => {
  let text = instagramDisplayText(url, title, description)
  try {
    const host = new URL(url).hostname
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') {
      // Facebook reel metadata: engagement counts | full caption | author.
      // The description is often only a truncated caption, so exact matching
      // alone cannot remove the duplicate from the title.
      const parts = title.split(/\s+[|｜]\s+/)
      const hasCounts = /\d/.test(parts[0] || '') && /reactions?|likes?|views?|shares?|心情|分享|觀看|讚/i.test(parts[0] || '')
      if (hasCounts && parts.length >= 2) {
        const author = parts.length >= 3 ? parts.pop()!.trim() : ''
        const caption = parts.slice(1).join(' | ').trim()
        const prefix = description.replace(/(?:\.\.\.|…)\s*$/, '').trim()
        text = {
          title: author && author.length <= 160 ? `${author} · Facebook` : 'Facebook 貼文',
          description: !description || (prefix && caption.startsWith(prefix)) ? caption : description
        }
      }
      else if (title.length > 160 || /[\r\n]/.test(title)) {
        text = { title: 'Facebook 貼文', description: description || title }
      }
    }
  }
  catch { /* Non-URL legacy records retain their text. */ }
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
