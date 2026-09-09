import { QueryClient, dehydrate, hydrate } from '@tanstack/react-query'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'

const DAY_MS = 24 * 60 * 60 * 1_000
const CACHE_KEY = 'connectors.local-first.reads.v1'
const CACHE_BUSTER = 'connectors-read-contract-v3'

export const LOCAL_FIRST_QUERY_KEYS = {
  roster: ['sentence-structure-roster'] as const,
  savedFloors: ['saved-floor-plans'] as const,
  posCatalog: ['pos-catalog'] as const,
  databaseLayout: (schema: 'public' | 'words_clean') => ['database-layout', schema] as const,
  learnedWords: ['learned-words'] as const,
  guestPatternCategories: ['guest-pattern-categories'] as const,
}

export const localFirstQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * DAY_MS,
      retry: false,
      staleTime: 15_000,
    },
  },
})

const persister: Persister = {
  persistClient: (client) => set(CACHE_KEY, client),
  restoreClient: () => get<PersistedClient>(CACHE_KEY),
  removeClient: () => del(CACHE_KEY),
}

let initialized: Promise<void> | null = null
let persistTimer: number | null = null

export function initializeLocalFirstData(): Promise<void> {
  if (initialized != null) return initialized
  initialized = (async () => {
    if (typeof window === 'undefined') return
    try {
      const restored = await persister.restoreClient()
      if (
        restored != null
        && restored.buster === CACHE_BUSTER
        && Date.now() - restored.timestamp <= 7 * DAY_MS
      ) {
        hydrate(localFirstQueryClient, restored.clientState)
      } else if (restored != null) {
        await persister.removeClient()
      }
    } catch {
      // IndexedDB is an optional display cache. The guarded server remains usable.
    }
    localFirstQueryClient.getQueryCache().subscribe(() => {
      if (persistTimer != null) window.clearTimeout(persistTimer)
      persistTimer = window.setTimeout(() => {
        persistTimer = null
        void Promise.resolve(persister.persistClient({
          buster: CACHE_BUSTER,
          timestamp: Date.now(),
          clientState: dehydrate(localFirstQueryClient, {
            shouldDehydrateQuery: (query) => query.state.status === 'success',
          }),
        })).catch(() => undefined)
      }, 1_000)
    })
  })()
  return initialized
}

export async function localFirstRead<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
): Promise<T> {
  if (typeof indexedDB === 'undefined') return queryFn()
  await initializeLocalFirstData()
  const cached = localFirstQueryClient.getQueryData<T>(queryKey)
  if (cached !== undefined) {
    void localFirstQueryClient.fetchQuery({ queryKey, queryFn }).catch(() => undefined)
    return cached
  }
  return localFirstQueryClient.fetchQuery({ queryKey, queryFn })
}

export function adoptLocalFirstData<T>(queryKey: readonly unknown[], data: T): void {
  localFirstQueryClient.setQueryData(queryKey, data)
}

export function updateLocalFirstData<T>(
  queryKey: readonly unknown[],
  updater: (current: T | undefined) => T,
): void {
  localFirstQueryClient.setQueryData<T>(queryKey, updater)
}

export function subscribeToLocalFirstData<T>(
  queryKey: readonly unknown[],
  listener: (data: T) => void,
): () => void {
  return localFirstQueryClient.getQueryCache().subscribe((event) => {
    if (JSON.stringify(event.query.queryKey) !== JSON.stringify(queryKey)) return
    const data = event.query.state.data as T | undefined
    if (data !== undefined) listener(data)
  })
}
