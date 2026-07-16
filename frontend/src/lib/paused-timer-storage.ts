import type { PausedTimerTarget } from '@/types/time-entry'

const STORAGE_KEY = 'kairo:paused-timer-target'

export function readPausedTimerTarget(): PausedTimerTarget | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as PausedTimerTarget

    if (parsed.activity || parsed.task) {
      return parsed
    }

    return null
  } catch {
    return null
  }
}

export function writePausedTimerTarget(target: PausedTimerTarget | null) {
  if (!target) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(target))
}
