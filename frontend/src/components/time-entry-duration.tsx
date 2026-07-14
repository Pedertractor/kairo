import { useEffect, useState } from 'react'

import { useActiveTimer, useElapsedSeconds } from '@/hooks/use-active-timer'
import { formatElapsed } from '@/lib/format-elapsed'
import { formatLoggedDuration } from '@/lib/format-duration'

function useElapsedSince(startedAt: string, enabled: boolean): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!enabled) {
      return
    }

    function updateElapsed() {
      const startedAtMs = new Date(startedAt).getTime()
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)),
      )
    }

    updateElapsed()
    const intervalId = window.setInterval(updateElapsed, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [startedAt, enabled])

  return elapsedSeconds
}

function ActiveEntryElapsed() {
  const elapsedSeconds = useElapsedSeconds()

  return (
    <span className="font-mono text-base font-semibold tabular-nums text-sidebar-primary">
      {formatElapsed(elapsedSeconds)}
    </span>
  )
}

interface TimeEntryDurationProps {
  id: string
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
}

export function TimeEntryDuration({
  id,
  startedAt,
  endedAt,
  durationSeconds,
}: TimeEntryDurationProps) {
  const { activeTimer } = useActiveTimer()
  const isActiveEntry = activeTimer?.timeEntry.id === id
  const isInProgress = endedAt === null
  const fallbackElapsed = useElapsedSince(startedAt, isInProgress && !isActiveEntry)

  if (!isInProgress) {
    return (
      <span className="tabular-nums">
        {formatLoggedDuration(durationSeconds ?? 0)}
      </span>
    )
  }

  if (isActiveEntry) {
    return <ActiveEntryElapsed />
  }

  return (
    <span className="font-mono text-base font-semibold tabular-nums text-sidebar-primary">
      {formatElapsed(fallbackElapsed)}
    </span>
  )
}
