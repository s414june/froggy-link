interface LinkMetadata {
  title: string
  description: string
  imageUrl: string
}

const emptyMetadata = (): LinkMetadata => ({
  title: '',
  description: '',
  imageUrl: ''
})

const trimMatch = (value: string | undefined) => {
  return value?.trim() ?? ''
}

const decodeHtml = (value: string) => {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', '\'')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const extractMetaValue = (html: string, key: string, attr: 'property' | 'name') => {
  const escapedKey = escapeRegex(key)
  const patterns = [
    new RegExp(`<meta[^>]*${attr}\\s*=\\s*["']${escapedKey}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${attr}\\s*=\\s*["']${escapedKey}["'][^>]*>`, 'i')
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(html)
    if (match && match[1]) {
      return decodeHtml(trimMatch(match[1]))
    }
  }

  return ''
}

const extractTitle = (html: string) => {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return decodeHtml(trimMatch(match?.[1]))
}

const toAbsoluteUrl = (targetUrl: string, value: string) => {
  if (!value) {
    return ''
  }

  try {
    return new URL(value, targetUrl).toString()
  }
  catch {
    return ''
  }
}

const parseFromHtml = (html: string, targetUrl: string): LinkMetadata => {
  const title = extractMetaValue(html, 'og:title', 'property')
    || extractMetaValue(html, 'twitter:title', 'name')
    || extractTitle(html)

  const description = extractMetaValue(html, 'og:description', 'property')
    || extractMetaValue(html, 'description', 'name')
    || extractMetaValue(html, 'twitter:description', 'name')

  const imageUrl = toAbsoluteUrl(
    targetUrl,
    extractMetaValue(html, 'og:image', 'property')
      || extractMetaValue(html, 'twitter:image', 'name')
  )

  return {
    title,
    description,
    imageUrl
  }
}

const youtubeVideoUrl = (url: string) => {
  const parsed = new URL(url)
  const host = parsed.hostname.toLowerCase()
  let id = ''
  if (host === 'youtu.be') {
    id = parsed.pathname.split('/')[1] || ''
  }
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    id = parsed.pathname === '/watch'
      ? parsed.searchParams.get('v') || ''
      : /^\/(?:shorts|live|embed)\/([^/]+)/.exec(parsed.pathname)?.[1] || ''
  }

  return /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : ''
}

const fetchEmbedMetadata = async (endpoint: string) => {
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    return emptyMetadata()
  }

  const data = await response.json() as {
    title?: string
    thumbnail_url?: string
    author_name?: string
    provider_name?: string
  }

  const title = trimMatch(data.title)
  const imageUrl = trimMatch(data.thumbnail_url)
  const descriptionParts = [trimMatch(data.provider_name), trimMatch(data.author_name)].filter(Boolean)

  return {
    title,
    imageUrl,
    description: descriptionParts.join(' · ')
  }
}

// Keep partial page metadata and fill missing fields from the media provider.
export const resolveLinkMetadata = async (targetUrl: string): Promise<LinkMetadata> => {
  let metadata = emptyMetadata()
  let resolvedUrl = targetUrl
  const youtubeUrl = youtubeVideoUrl(targetUrl)

  // App shares often use youtu.be or Shorts. Ask YouTube directly before
  // fetching HTML, which may only contain a consent screen or generic title.
  if (youtubeUrl) {
    try {
      metadata = await fetchEmbedMetadata(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeUrl)}`)
      if (metadata.title && metadata.imageUrl) {
        return metadata
      }
    }
    catch {
      // Continue with page metadata and noembed if YouTube is unavailable.
    }
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'froggy-link-metadata-fetcher/1.0',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (response.ok) {
      resolvedUrl = response.url || targetUrl
      const pageMetadata = parseFromHtml(await response.text(), resolvedUrl)
      metadata = {
        title: metadata.title || pageMetadata.title,
        description: metadata.description || pageMetadata.description,
        imageUrl: metadata.imageUrl || pageMetadata.imageUrl
      }
      if (metadata.title && metadata.description && metadata.imageUrl) {
        return metadata
      }
    }
  }
  catch {
    // A page failure must not prevent the provider fallback.
  }

  try {
    const embedUrl = youtubeUrl || youtubeVideoUrl(resolvedUrl) || resolvedUrl
    const fallback = await fetchEmbedMetadata(`https://noembed.com/embed?url=${encodeURIComponent(embedUrl)}`)
    return {
      title: metadata.title || fallback.title,
      description: metadata.description || fallback.description,
      imageUrl: metadata.imageUrl || toAbsoluteUrl(resolvedUrl, fallback.imageUrl)
    }
  }
  catch {
    return metadata
  }
}
