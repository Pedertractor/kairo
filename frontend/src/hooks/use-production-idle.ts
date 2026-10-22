import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { PRODUCTION_DEADLINE_KEY, PRODUCTION_IDLE_MS, remainingIdleSeconds } from '@/lib/production-idle'

export function useProductionIdle() {
  const { logout } = useAuth()
  const [remaining, setRemaining] = useState(() => remainingIdleSeconds(Number(sessionStorage.getItem(PRODUCTION_DEADLINE_KEY))))

  useEffect(() => {
    let deadline = Number(sessionStorage.getItem(PRODUCTION_DEADLINE_KEY))
    let stopped = false
    let heartbeat: ReturnType<typeof setTimeout> | undefined
    const expire = () => {
      if (stopped) return
      stopped = true
      void logout()
    }
    const check = () => {
      const seconds = remainingIdleSeconds(deadline)
      setRemaining(seconds)
      if (seconds <= 0) expire()
    }
    const interact = () => {
      if (stopped) return
      if (Date.now() >= deadline) { expire(); return }
      deadline = Date.now() + PRODUCTION_IDLE_MS
      sessionStorage.setItem(PRODUCTION_DEADLINE_KEY, String(deadline))
      setRemaining(15)
      // Only input renews the server session; rendering, polling and focus do not.
      if (heartbeat === undefined) {
        heartbeat = setTimeout(() => {
          heartbeat = undefined
          void api('/production/session/activity', { method: 'POST', toastOnError: false })
            .catch(expire)
        }, 250)
      }
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
    for (const event of events) window.addEventListener(event, interact, { passive: true })
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    const interval = setInterval(check, 100)
    check()
    return () => {
      stopped = true
      clearInterval(interval)
      clearTimeout(heartbeat)
      for (const event of events) window.removeEventListener(event, interact)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [logout])
  return remaining
}
