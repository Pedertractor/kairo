import { useEffect, useState } from 'react'

import { TeamDayTimeline } from '@/components/team-day-timeline'
import { api } from '@/lib/api-handler'
import { toDateKey } from '@/lib/date'
import type { AdminTeamsDayDashboard } from '@/types/time-entry'

interface AdminLeaderDayTimelineProps {
  leaderId: string
  /** Narrows the timeline to one collaborator of the leader. */
  userId?: string
  title: string
}

/** Day timeline of a leader's / supervisor's collaborators, for the admin panel. */
export function AdminLeaderDayTimeline({
  leaderId,
  userId,
  title,
}: AdminLeaderDayTimelineProps) {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [dashboard, setDashboard] = useState<AdminTeamsDayDashboard | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ date: selectedDate })
    if (userId) params.set('userId', userId)

    setIsLoading(true)
    api<AdminTeamsDayDashboard>(
      `/admin/dashboard/leaders/${encodeURIComponent(leaderId)}/day?${params.toString()}`,
      { toastOnSuccess: false },
    )
      .then((data) => {
        if (!cancelled) setDashboard(data)
      })
      .catch(() => {
        if (!cancelled) setDashboard(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leaderId, selectedDate, userId])

  return (
    <TeamDayTimeline
      title={title}
      blocks={dashboard?.blocks ?? []}
      absences={dashboard?.absences ?? []}
      members={dashboard?.members ?? []}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      isLoading={isLoading}
    />
  )
}
