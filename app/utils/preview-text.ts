const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'grapheme' })

// CJK, full-width forms and emoji occupy two half-width character units.
const wide = /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6\u{20000}-\u{3ffff}]|\p{Extended_Pictographic}|\p{Regional_Indicator}/u
export function previewText(description: string, title: string, url: string) {
  const source = [description, title, url].find(value => value.trim()) || ''
  const firstLine = source.trim().split(/\r\n|[\n\r\u2028\u2029]/u)[0]!.trim()
  const characters: { text: string, wide: boolean }[] = []
  let units = 0
  for (const { segment } of segmenter.segment(firstLine)) {
    const isWide = wide.test(segment)
    const size = isWide ? 2 : 1
    if (units + size > 198) {
      characters.push({ text: '...', wide: false })
      break
    }
    characters.push({ text: segment, wide: isWide })
    units += size
  }
  return { text: characters.map(char => char.text).join(''), characters }
}
