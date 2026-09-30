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

const fetchNoembedMetadata = async (url: string) => {
  const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(url)}`
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' }
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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawUrl = typeof query.url === 'string' ? query.url : ''

  if (!rawUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing url query parameter.'
    })
  }

  let targetUrl = ''
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol')
    }
    targetUrl = parsed.toString()
  }
  catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid URL.'
    })
  }

  try {
    const pageResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'froggy-link-metadata-fetcher/1.0',
        Accept: 'text/html,application/xhtml+xml'
      }
    })

    if (pageResponse.ok) {
      const html = await pageResponse.text()
      const parsed = parseFromHtml(html, targetUrl)
      if (parsed.title || parsed.description || parsed.imageUrl) {
        return parsed
      }
    }
  }
  catch {
    // Continue to noembed fallback.
  }

  try {
    const fallback = await fetchNoembedMetadata(targetUrl)
    if (fallback.title || fallback.description || fallback.imageUrl) {
      return fallback
    }
  }
  catch {
    // Return empty metadata.
  }

  return emptyMetadata()
})
