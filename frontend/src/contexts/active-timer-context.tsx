import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { api } from '@/lib/api-handler'
import { invalidateHomeData } from '@/lib/home-data-invalidation'
import type {
  ActiveTimer,
  ActiveTimerResponse,
  PauseTimerResponse,
  StartTimerResponse,
} from '@/types/time-entry'

interface ActiveTimerContextValue {
  activeTimer: ActiveTimer | null
  elapsedSeconds: number
  isActive: boolean
  isStarting: boolean
  isPausing: boolean
  refresh: () => Promise<void>
  startTimer: (teamId: string, activityId: string) => Promise<void>
  pauseTimer: () => Promise<void>
  isActivityActive: (activityId: string) => boolean
}

const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null)

export function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [isPausing, setIsPausing] = useState(false)

  const refresh = useCallback(async () => {
    const data = await api<ActiveTimerResponse>('/time-entries/active', {
      toastOnError: false,
    })
    setActiveTimer(data.activeTimer)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0)
      return
    }

    const updateElapsed = () => {
      const startedAt = new Date(activeTimer.timeEntry.startedAt).getTime()
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    }

    updateElapsed()
    const intervalId = window.setInterval(updateElapsed, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeTimer])

  const startTimer = useCallback(
    async (teamId: string, activityId: string) => {
      setIsStarting(true)

      try {
        const data = await api<StartTimerResponse>(
          `/teams/${teamId}/activities/${activityId}/time-entries`,
          { method: 'POST' },
        )
        setActiveTimer(data.activeTimer)
        invalidateHomeData()
      } finally {
        setIsStarting(false)
      }
    },
    [],
  )

  const pauseTimer = useCallback(async () => {
    setIsPausing(true)

    try {
      await api<PauseTimerResponse>('/time-entries/active/pause', {
        method: 'POST',
      })
      setActiveTimer(null)
      invalidateHomeData()
    } finally {
      setIsPausing(false)
    }
  }, [])

  const isActivityActive = useCallback(
    (activityId: string) => activeTimer?.activity.id === activityId,
    [activeTimer],
  )

  const value = useMemo(
    () => ({
      activeTimer,
      elapsedSeconds,
      isActive: activeTimer !== null,
      isStarting,
      isPausing,
      refresh,
      startTimer,
      pauseTimer,
      isActivityActive,
    }),
    [
      activeTimer,
      elapsedSeconds,
      isStarting,
      isPausing,
      refresh,
      startTimer,
      pauseTimer,
      isActivityActive,
    ],
  )

  return (
    <ActiveTimerContext.Provider value={value}>
      {children}
    </ActiveTimerContext.Provider>
  )
}

export function useActiveTimer() {
  const context = useContext(ActiveTimerContext)

  if (!context) {
    throw new Error('useActiveTimer deve ser usado dentro de ActiveTimerProvider')
  }

  return context
}
