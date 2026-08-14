type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeActivityDataInvalidation(listener: Listener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function invalidateActivityData() {
  listeners.forEach((listener) => listener())
}
