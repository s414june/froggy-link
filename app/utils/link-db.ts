import type { LinkItem } from '~/types/link'

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
  const db = await openDatabase()

  try {
    const transaction = db.transaction(LINK_STORE, 'readwrite')
    const store = transaction.objectStore(LINK_STORE)
    await runRequest(store.put(link))
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
