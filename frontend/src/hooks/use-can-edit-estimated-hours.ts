import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import type { TeamResponse } from '@/types/team'

export function useCanEditEstimatedHours(
  teamId: string | null | undefined,
  createdById: string | null | undefined,
  enabled = true,
) {
  const { user } = useAuth()
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (!enabled || !teamId || !createdById || !user) {
      setCanEdit(false)
      return
    }

    if (user.role === 'ADMIN' || user.id === createdById) {
      setCanEdit(true)
      return
    }

    let cancelled = false

    async function loadTeamRole() {
      try {
        const data = await api<TeamResponse>(`/teams/${teamId}`, {
          toastOnError: false,
        })

        if (!cancelled) {
          setCanEdit(data.team.role === 'ADMIN')
        }
      } catch {
        if (!cancelled) {
          setCanEdit(false)
        }
      }
    }

    void loadTeamRole()

    return () => {
      cancelled = true
    }
  }, [enabled, teamId, createdById, user])

  return canEdit
}
