export const instagramPostUrl = (value: string) => {
  try {
    const url = new URL(value)
    if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname)) return ''
    const post = /^\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)(?:\/|$)/.exec(url.pathname)
    return post ? `https://www.instagram.com/${post[1]}/${post[2]}/` : ''
  }
  catch { return '' }
}

// Normalize at display time as well as metadata extraction so old bookmarks
// benefit without rewriting IndexedDB. Only recognized author labels become
// titles; unknown provider formats stay in the body instead of repeating it.
export const instagramDisplayText = (url: string, title: string, description: string) => {
  try {
    if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(new URL(url).hostname)) return { title, description }
  }
  catch { return { title, description } }
  const match = /^([^\n]*?)\s+(?:on Instagram|在 Instagram 上)\s*[:：]\s*([\s\S]+)$/i.exec(title)
  if (match) {
    const caption = match[2]!.replace(/^["“]|["”]$/g, '').trim()
    return { title: `${match[1]!.trim()} · Instagram`, description: description || caption }
  }
  const authorTitle = /^([^\n]+?)\s*[•·]\s*Instagram(?: photos and videos)?\s*$/i.exec(title)
  if (authorTitle && authorTitle[1]!.length <= 160) {
    return { title: `${authorTitle[1]!.trim()} · Instagram`, description }
  }
  const handle = /\(@([\w.]+)\)/.exec(title)
    || /(?:^| - )([\w.]+) on [A-Z][a-z]+ \d{1,2}, \d{4}:/.exec(description)
  const label = handle ? `@${handle[1]} · Instagram` : 'Instagram 貼文'
  return { title: label, description: description || (title === 'Instagram 貼文' ? '' : title) }
}
