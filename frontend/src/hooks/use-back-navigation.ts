import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type HistoryState = { idx?: number } | null

export function useBackNavigation(fallbackTo: string) {
  const navigate = useNavigate()
  const location = useLocation()

  // O router mantem o indice da entrada atual em window.history.state.idx.
  // idx > 0 garante que a entrada anterior foi criada pelo proprio app.
  const historyIndex = (window.history.state as HistoryState)?.idx
  const canGoBack =
    typeof historyIndex === 'number'
      ? historyIndex > 0
      : location.key !== 'default'

  const goBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1)
      return
    }

    navigate(fallbackTo)
  }, [canGoBack, fallbackTo, navigate])

  return { canGoBack, goBack }
}
