type CacheEntry<T> = {
  data: T
  fetchedAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL_MS = 60_000

export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
  force = false,
): Promise<T> {
  if (!force) {
    const entry = cache.get(key) as CacheEntry<T> | undefined

    if (entry && Date.now() - entry.fetchedAt < ttlMs) {
      return entry.data
    }

    const pending = inflight.get(key) as Promise<T> | undefined

    if (pending) {
      return pending
    }
  }

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, fetchedAt: Date.now() })
      inflight.delete(key)
      return data
    })
    .catch((error) => {
      inflight.delete(key)
      throw error
    })

  inflight.set(key, promise)

  return promise
}

export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }

  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) {
      inflight.delete(key)
    }
  }
}
