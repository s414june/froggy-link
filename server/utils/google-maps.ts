export const isGoogleMapsUrl = (value: string) => {
  try {
    const url = new URL(value)
    const host = url.hostname
    if (host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps'))) return true
    return /^(?:www\.|maps\.)?google\.(?:com|com\.tw|co\.jp|co\.uk|com\.au|ca|de|fr)$/.test(host)
      && (host.startsWith('maps.') || /^\/maps(?:\/|$)/.test(url.pathname))
  }
  catch { return false }
}

export const googleMapsUrlLabel = (value: string) => {
  if (!isGoogleMapsUrl(value)) return ''
  const url = new URL(value)
  const place = /^\/maps\/place\/([^/]+)/.exec(url.pathname)?.[1]
  if (place) {
    try { return decodeURIComponent(place.replace(/\+/g, ' ')).trim() }
    catch { return '' }
  }
  const query = url.searchParams.get('query') || url.searchParams.get('q') || ''
  if (/^(?:place_id:|loc:|https?:)/i.test(query)) return ''
  return query.trim()
}

export const isGenericMapsTitle = (title: string) => !title.trim() || /^(?:Google\s*(?:Maps|地圖|地图|マップ)|Google)$/i.test(title.trim())

export const cleanMapsTitle = (title: string) => title.replace(/\s*[-–—|]\s*Google\s*(?:Maps|地圖|地图|マップ)\s*$/i, '').trim()
