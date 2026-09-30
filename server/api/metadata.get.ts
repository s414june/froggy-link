import { resolveLinkMetadata } from '../utils/link-metadata'

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

  return resolveLinkMetadata(targetUrl)
})
