export const instagramPostUrl = (value: string) => {
  try {
    const url = new URL(value)
    if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname)) return ''
    const post = /^\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)(?:\/|$)/.exec(url.pathname)
    return post ? `https://www.instagram.com/${post[1]}/${post[2]}/` : ''
  }
  catch { return '' }
}

// Only remove the caption from recognized Instagram title formats. Keep it
// in the description if the source did not provide one; never mutate storage.
export const instagramDisplayText = (url: string, title: string, description: string) => {
  if (!instagramPostUrl(url)) return { title, description }
  const match = /^(.*?)\s+(?:on Instagram|在 Instagram 上)\s*[:：]\s*([\s\S]+)$/i.exec(title)
  if (match) {
    const caption = match[2]!.replace(/^["“]|["”]$/g, '').trim()
    return { title: `${match[1]!.trim()} · Instagram`, description: description || caption }
  }
  if (title.trim() && title.trim() === description.trim()) return { title: 'Instagram 貼文', description }
  return { title, description }
}
