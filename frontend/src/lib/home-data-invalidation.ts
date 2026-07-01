import { invalidateCache } from '@/lib/query-cache'

type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeHomeDataInvalidation(listener: Listener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function invalidateHomeData() {
  invalidateCache('day:')
  invalidateCache('recent')
  listeners.forEach((listener) => listener())
}
