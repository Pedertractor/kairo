import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { AbsenceUnseenCountResponse } from '@/types/absence'

const POLL_INTERVAL_MS = 60_000

type UnseenState = {
  count: number
  absencesSeenAt: string | null
}

let state: UnseenState = { count: 0, absencesSeenAt: null }
const listeners = new Set<() => void>()
let fetchGeneration = 0

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function setState(next: UnseenState) {
  state = next
  emit()
}

export async function refreshUnseenAbsences(): Promise<void> {
  const generation = ++fetchGeneration

  try {
    const data = await api<AbsenceUnseenCountResponse>('/absences/unseen-count', {
      toastOnError: false,
    })

    if (generation !== fetchGeneration) {
      return
    }

    setState({
      count: data.count,
      absencesSeenAt: data.absencesSeenAt,
    })
  } catch {
    // Background poll: keep previous count on failure.
  }
}

export async function markAbsencesSeen(): Promise<AbsenceUnseenCountResponse | null> {
  fetchGeneration += 1

  try {
    const data = await api<AbsenceUnseenCountResponse>('/absences/seen', {
      method: 'POST',
      toastOnError: false,
      toastOnSuccess: false,
    })
    setState({
      count: 0,
      absencesSeenAt: data.absencesSeenAt,
    })
    return data
  } catch {
    return null
  }
}

export function useUnseenAbsencesCount() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [snapshot, setSnapshot] = useState(state)
  const enabled = Boolean(user?.hasOwnedTeams)

  const sync = useCallback(() => {
    setSnapshot(state)
  }, [])

  useEffect(() => {
    listeners.add(sync)
    return () => {
      listeners.delete(sync)
    }
  }, [sync])

  useEffect(() => {
    if (!enabled) {
      setState({ count: 0, absencesSeenAt: null })
      return
    }

    void refreshUnseenAbsences()

    const intervalId = window.setInterval(() => {
      void refreshUnseenAbsences()
    }, POLL_INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnseenAbsences()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, pathname])

  return {
    count: enabled ? snapshot.count : 0,
    absencesSeenAt: enabled ? snapshot.absencesSeenAt : null,
  }
}
