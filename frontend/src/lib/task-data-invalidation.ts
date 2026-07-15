type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeTaskDataInvalidation(listener: Listener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function invalidateTaskData() {
  listeners.forEach((listener) => listener())
}
