import { useEffect, useRef } from 'react'

/** Refresh open views after changes from integrations and other sessions. */
export function useVisibleRefresh(refresh: () => Promise<unknown>, enabled = true, intervalMs = 5_000) {
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  useEffect(() => {
    if (!enabled) return
    let busy = false
    let disposed = false
    const run = async () => {
      if (disposed || busy || document.visibilityState !== 'visible') return
      busy = true
      try { await latest.current() } catch { /* Retain the view during temporary failures. */ }
      finally { busy = false }
    }
    const timer = window.setInterval(() => { void run() }, intervalMs)
    const onVisible = () => { void run() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, intervalMs])
}
