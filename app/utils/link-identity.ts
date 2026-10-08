import { instagramPostUrl } from './instagram.ts'

// Only discard known tracking parameters; content IDs, unknown queries and
// fragments remain significant so distinct pages are never merged by title.
export const linkIdentity = (value: string): string => {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`)
    for (const name of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(name) || /^(fbclid|gclid|dclid|msclkid)$/i.test(name)) url.searchParams.delete(name)
    }
    const host = url.hostname.toLowerCase()
    const instagram = instagramPostUrl(url.href)
    if (instagram) {
      const canonical = new URL(instagram)
      url.protocol = canonical.protocol
      url.hostname = canonical.hostname
      url.pathname = canonical.pathname
      for (const name of ['stkn', 'igsh', 'igshid']) url.searchParams.delete(name)
    }

    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
      const id = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0]
        : url.pathname === '/watch' ? url.searchParams.get('v')
          : /^\/(?:shorts|embed|live)\/([^/]+)/.exec(url.pathname)?.[1]
      if (id && /^[\w-]{11}$/.test(id)) {
        // Retain playlist/time parameters: users may intentionally save these.
        url.hostname = 'www.youtube.com'
        url.protocol = 'https:'
        url.pathname = '/watch'
        url.searchParams.set('v', id)
        url.searchParams.delete('si')
        url.searchParams.delete('feature')
      }
    }
    if (['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'].includes(host)) {
      url.hostname = 'www.threads.com'
      url.protocol = 'https:'
      url.pathname = url.pathname.replace(/\/$/, '') || '/'
      for (const name of ['xmt', 'slof']) url.searchParams.delete(name)
    }
    if (host === 'maps.app.goo.gl') url.searchParams.delete('g_st')
    url.searchParams.sort()
    return url.href
  }
  catch { return value.trim() }
}
