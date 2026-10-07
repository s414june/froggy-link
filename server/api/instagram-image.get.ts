import { instagramPostUrl } from '../../app/utils/instagram'
import { resolveLinkMetadata } from '../utils/link-metadata'

export default defineEventHandler(async (event) => {
  const raw = getQuery(event).url
  const post = typeof raw === 'string' ? instagramPostUrl(raw) : ''
  if (!post) throw createError({ statusCode: 400, statusMessage: 'Invalid Instagram post' })
  const metadata = await resolveLinkMetadata(post)
  let image: URL
  try { image = new URL(metadata.imageUrl) }
  catch { throw createError({ statusCode: 404, statusMessage: 'No preview image' }) }
  // Never proxy an arbitrary host or follow a CDN redirect to an unchecked host.
  if (image.protocol !== 'https:' || image.port || image.username || image.password
    || !/\.(cdninstagram\.com|fbcdn\.net)$/.test(image.hostname)) {
    throw createError({ statusCode: 404, statusMessage: 'No supported preview image' })
  }
  const response = await fetch(image, { redirect: 'error', signal: AbortSignal.timeout(8000) })
  const type = response.headers.get('content-type')?.split(';')[0] || ''
  if (!response.ok || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type)) {
    throw createError({ statusCode: 404, statusMessage: 'Preview unavailable' })
  }
  const reader = response.body?.getReader()
  if (!reader) throw createError({ statusCode: 404 })
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 8 * 1024 * 1024) {
      await reader.cancel()
      throw createError({ statusCode: 413, statusMessage: 'Preview too large' })
    }
    chunks.push(value)
  }
  setHeader(event, 'Content-Type', type)
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.concat(chunks)
})
