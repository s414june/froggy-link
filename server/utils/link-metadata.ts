import { decodeHTML, decodeHTMLAttribute } from 'entities'

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

// Parse quoted attribute values before decoding entities so encoded quotes
// cannot terminate an attribute or truncate the post text.
const extractMetaValue = (html: string, key: string, attr: 'property' | 'name') => {
  const tags = html.match(/<meta\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi) ?? []
  for (const tag of tags) {
    const attributes: Record<string, string> = {}
    const pattern = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    for (const match of tag.matchAll(pattern)) {
      attributes[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
    }
    if (attributes[attr]?.toLowerCase() === key.toLowerCase() && attributes.content) {
      return decodeHTMLAttribute(attributes.content).trim()
    }
  }
  return ''
}

const extractTitle = (html: string) => {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return decodeHTML(trimMatch(match?.[1]))
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

interface ShopeeLinkInfo {
  domain: string
  shopId: string
  itemId: string
  slug: string
}

const isShopeeDomain = (hostname: string) => {
  return /(^|\.)shopee\.[a-z.]+$/i.test(hostname)
}

const parseShopeeLinkInfo = (targetUrl: string): ShopeeLinkInfo | null => {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  }
  catch {
    return null
  }

  if (!isShopeeDomain(parsed.hostname)) {
    return null
  }

  const dashPattern = /-i\.(\d+)\.(\d+)(?:$|[/?#])/i.exec(parsed.pathname)
  if (dashPattern) {
    const slugSegment = parsed.pathname.split('/').filter(Boolean).pop() || ''
    const slug = slugSegment.replace(/-i\.\d+\.\d+.*$/i, '')
    return {
      domain: parsed.origin,
      shopId: dashPattern[1] || '',
      itemId: dashPattern[2] || '',
      slug
    }
  }

  const productPattern = /^\/product\/(\d+)\/(\d+)(?:\/|$)/i.exec(parsed.pathname)
  if (productPattern) {
    return {
      domain: parsed.origin,
      shopId: productPattern[1] || '',
      itemId: productPattern[2] || '',
      slug: ''
    }
  }

  return null
}

const decodeShopeeSlug = (slug: string) => {
  if (!slug) {
    return ''
  }

  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  }
  catch {
    decoded = slug
  }

  return decoded
    .replace(/[+\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const buildScreenshotFallbackUrl = (targetUrl: string) => {
  if (!targetUrl) {
    return ''
  }

  // Some commerce pages block direct metadata APIs for anonymous requests.
  // Use a rendered screenshot as a stable preview fallback.
  return `https://image.thum.io/get/width/1200/noanimate/${targetUrl}`
}

const buildShopeeMetadataFallback = (targetUrl: string): LinkMetadata => {
  const info = parseShopeeLinkInfo(targetUrl)
  if (!info) {
    return emptyMetadata()
  }

  const readableTitle = decodeShopeeSlug(info.slug)
  const title = readableTitle || `蝦皮商品 ${info.shopId}/${info.itemId}`
  const canonicalUrl = `${info.domain}/product/${info.shopId}/${info.itemId}`

  return {
    title,
    description: `蝦皮購物商品 · 商店 ${info.shopId} · 商品 ${info.itemId}`,
    imageUrl: buildScreenshotFallbackUrl(canonicalUrl)
  }
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
    metadata = {
      title: metadata.title || fallback.title,
      description: metadata.description || fallback.description,
      imageUrl: metadata.imageUrl || toAbsoluteUrl(resolvedUrl, fallback.imageUrl)
    }
  }
  catch {
    // Keep existing metadata and continue to domain-specific fallbacks.
  }

  if (!metadata.title || !metadata.description || !metadata.imageUrl) {
    const shopeeMetadata = buildShopeeMetadataFallback(resolvedUrl || targetUrl)
    metadata = {
      title: metadata.title || shopeeMetadata.title,
      description: metadata.description || shopeeMetadata.description,
      imageUrl: metadata.imageUrl || shopeeMetadata.imageUrl
    }
  }

  return metadata
}
