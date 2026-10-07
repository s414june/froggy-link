interface LinkMetadata {
  title: string
  description: string
  imageUrl: string
}

export const fetchLinkMetadata = async (url: string) => {
  try {
    const response = await $fetch<LinkMetadata>('/api/metadata', {
      query: { url }
    })

    return {
      succeeded: true,
      title: response.title || '',
      description: response.description || '',
      imageUrl: response.imageUrl || ''
    }
  }
  catch {
    return {
      succeeded: false,
      title: '',
      description: '',
      imageUrl: ''
    }
  }
}
