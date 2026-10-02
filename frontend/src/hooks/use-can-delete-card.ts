import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-handler'
import { canDeleteTeamCard } from '@/lib/team-permissions'
import type { TeamResponse, TeamSummary } from '@/types/team'

export function useCanDeleteCard(
  teamId: string | null | undefined,
  createdById: string | null | undefined,
) {
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    setTeam(null)
    if (teamId) {
      void api<TeamResponse>(`/teams/${teamId}`, { toastOnError: false })
        .then((data) => {
          if (!cancelled) setTeam(data.team)
        })
        .catch(() => {
          if (!cancelled) setTeam(null)
        })
    }
    return () => { cancelled = true }
  }, [teamId])

  return Boolean(team && team.id === teamId && createdById && user &&
    canDeleteTeamCard(team, createdById, user.id))
}
