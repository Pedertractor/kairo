import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { TeamsListResponse } from '@/types/team'

export function useHasOwnedTeams(enabled = true) {
  const { user } = useAuth()
  const [ownedForUserId, setOwnedForUserId] = useState<string | null>(null)
  const [hasOwnedTeams, setHasOwnedTeams] = useState(false)

  useEffect(() => {
    let active = true

    async function loadTeams() {
      if (!enabled || !user) {
        if (active) {
          setOwnedForUserId(null)
          setHasOwnedTeams(false)
        }
        return
      }

      try {
        const data = await api<TeamsListResponse>('/teams', {
          toastOnError: false,
        })

        if (active) {
          setHasOwnedTeams(
            data.teams.some((team) => team.createdById === user.id),
          )
          setOwnedForUserId(user.id)
        }
      } catch {
        if (active) {
          setHasOwnedTeams(false)
          setOwnedForUserId(user.id)
        }
      }
    }

    void loadTeams()

    return () => {
      active = false
    }
  }, [enabled, user])

  if (!enabled || !user) {
    return { hasOwnedTeams: false, isLoading: false }
  }

  // React Router may reuse the parent component across routes. Treat the
  // result as loading until it was resolved for the current user while enabled.
  const isLoading = ownedForUserId !== user.id

  return {
    hasOwnedTeams: isLoading ? false : hasOwnedTeams,
    isLoading,
  }
}
