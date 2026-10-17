import { appendLinkTag, removeLinkTags } from '~/utils/link-tags'
import type { LinkItem } from '~/types/link'
import { toStoredLink } from '~/utils/link-storage'

const DB_NAME = 'froggy-link-db'
const DB_VERSION = 1
const LINK_STORE = 'links'

const ensureClient = () => {
  if (!import.meta.client || typeof window.indexedDB === 'undefined') {
    throw new Error('IndexedDB 僅能在瀏覽器環境使用。')
  }
}

const openDatabase = async () => {
  ensureClient()

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('無法開啟 IndexedDB。'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LINK_STORE)) {
        db.createObjectStore(LINK_STORE, { keyPath: 'id' })
      }
    }
  })
}

const runRequest = async <T>(request: IDBRequest<T>) => {
  return await new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 操作失敗。'))
  })
}

export const readAllLinks = async () => {
  const db = await openDatabase()

  try {
    const transaction = db.transaction(LINK_STORE, 'readonly')
    const store = transaction.objectStore(LINK_STORE)
    const result = await runRequest(store.getAll())

    const items = [...result].sort((a, b) => b.createdAt - a.createdAt)
    return items
  }
  finally {
    db.close()
  }
}

export const upsertLink = async (link: LinkItem) => {
  const storedLink = toStoredLink(link)
  const db = await openDatabase()

  try {
    const transaction = db.transaction(LINK_STORE, 'readwrite')
    const store = transaction.objectStore(LINK_STORE)
    await runRequest(store.put(storedLink))
  }
  finally {
    db.close()
  }
}

export const removeLink = async (id: string) => {
  const db = await openDatabase()

  try {
    const transaction = db.transaction(LINK_STORE, 'readwrite')
    const store = transaction.objectStore(LINK_STORE)
    await runRequest(store.delete(id))
  }
  finally {
    db.close()
  }
}


// Read and update within one transaction: retain other fields and either commit
// every selected tag change or none of them.
const updateTagsForLinks = async (ids: string[], update: (item: LinkItem) => LinkItem): Promise<LinkItem[]> => {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(LINK_STORE, 'readwrite')
      const store = transaction.objectStore(LINK_STORE)
      const updated: LinkItem[] = []
      transaction.oncomplete = () => resolve(updated)
      transaction.onabort = () => reject(transaction.error ?? new Error('批次更新標籤失敗，未套用變更。'))
      for (const id of new Set(ids)) {
        const request = store.get(id)
        request.onsuccess = () => {
          if (!request.result) return
          try {
            const item = update(request.result)
            if (item === request.result) return
            store.put(toStoredLink(item))
            updated.push(item)
          }
          catch { transaction.abort() }
        }
      }
    })
  }
  finally { db.close() }
}

export const appendTagToLinks = (ids: string[], tag: string) =>
  updateTagsForLinks(ids, item => ({ ...appendLinkTag(item, tag) }))

export const removeTagsFromLinks = (ids: string[], tags: string[]) =>
  updateTagsForLinks(ids, item => removeLinkTags(item, tags))
