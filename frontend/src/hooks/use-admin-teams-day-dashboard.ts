import { useCallback, useEffect, useState } from 'react'

import { api } from '@/lib/api-handler'
import { subscribeHomeDataInvalidation } from '@/lib/home-data-invalidation'
import { fetchCached } from '@/lib/query-cache'
import type { AdminTeamsDayDashboard } from '@/types/time-entry'

const ALL_TEAMS = 'all'

function fetchAdminTeamsDayDashboard(
  date: string,
  teamId: string | null,
  force = false,
) {
  const params = new URLSearchParams({ date })

  if (teamId) {
    params.set('teamId', teamId)
  }

  return fetchCached(
    `admin-teams-day:${date}:${teamId ?? ALL_TEAMS}`,
    () =>
      api<AdminTeamsDayDashboard>(
        `/time-entries/admin-teams/day?${params.toString()}`,
        { toastOnError: false },
      ),
    60_000,
    force,
  )
}

export function useAdminTeamsDayDashboard(
  selectedDate: string,
  teamFilter: string,
) {
  const selectedTeamId = teamFilter === ALL_TEAMS ? null : teamFilter
  const [dashboard, setDashboard] = useState<AdminTeamsDayDashboard | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboard = useCallback(
    async (force = false) => {
      setIsLoading(true)

      try {
        const data = await fetchAdminTeamsDayDashboard(
          selectedDate,
          selectedTeamId,
          force,
        )
        setDashboard(data)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedDate, selectedTeamId],
  )

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(
    () => subscribeHomeDataInvalidation(() => void loadDashboard(true)),
    [loadDashboard],
  )

  return {
    teams: dashboard?.teams ?? [],
    members: dashboard?.members ?? [],
    blocks: dashboard?.blocks ?? [],
    absences: dashboard?.absences ?? [],
    isLoading,
  }
}

export { ALL_TEAMS }
