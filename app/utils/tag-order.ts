export const selectedTagsFirst = (tags: readonly string[], selected: readonly string[]) => {
  const active = new Set(selected)
  return [...tags.filter(tag => active.has(tag)), ...tags.filter(tag => !active.has(tag))]
}
