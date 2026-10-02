import { useEffect, useMemo, useState } from 'react'

import {
  ALL_ACTIVITIES,
  DEFAULT_ACTIVITY_FILTERS,
  filterActivities,
  getActivityTagOptions,
  UNASSIGNED,
  updateActivityFilters,
  type ActivityFilterState,
  type ActivityTagFilterOption,
} from '@/lib/activity-filters'
import type { ActivitySummary } from '@/types/card'

export interface ActivityFilterOption {
  id: string
  name: string
  teamId?: string
  color?: string
}

interface Options {
  teams?: ActivityFilterOption[]
  tags?: ActivityTagFilterOption[]
  members?: ActivityFilterOption[]
  scopeTeamId?: string
}

export function useActivityFilters(activities: ActivitySummary[], options: Options = {}) {
  const [filters, setFilters] = useState(DEFAULT_ACTIVITY_FILTERS)
  const { teams, tags, members, scopeTeamId } = options

  // A different team page starts with the same defaults as the general page.
  useEffect(() => { setFilters(DEFAULT_ACTIVITY_FILTERS) }, [scopeTeamId])

  const scopedActivities = useMemo(() => activities.filter((activity) =>
    filters.team === ALL_ACTIVITIES || activity.teamId === filters.team,
  ), [activities, filters.team])

  const tagOptions = useMemo(() =>
    getActivityTagOptions(activities, tags ?? [], teams ?? [], filters.team),
  [activities, tags, teams, filters.team])

  const assigneeOptions = useMemo(() => {
    const byId = new Map<string, ActivityFilterOption>()
    for (const member of members ?? []) {
      if (filters.team === ALL_ACTIVITIES || member.teamId === filters.team) {
        byId.set(member.id, member)
      }
    }
    for (const activity of scopedActivities) {
      if (activity.assignedToId && !byId.has(activity.assignedToId)) {
        byId.set(activity.assignedToId, {
          id: activity.assignedToId,
          name: activity.assignedToName ?? 'Responsável indisponível',
        })
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [scopedActivities, members, filters.team])

  useEffect(() => {
    setFilters((current) => {
      const team = current.team === ALL_ACTIVITIES || teams?.some((item) => item.id === current.team)
        ? current.team : ALL_ACTIVITIES
      const tag = current.tag === ALL_ACTIVITIES || tagOptions.some((item) => item.id === current.tag)
        ? current.tag : ALL_ACTIVITIES
      const assignee = current.assignee === ALL_ACTIVITIES || current.assignee === UNASSIGNED ||
        assigneeOptions.some((item) => item.id === current.assignee)
        ? current.assignee : ALL_ACTIVITIES
      return team === current.team && tag === current.tag && assignee === current.assignee
        ? current : { ...current, team, tag, assignee }
    })
  }, [teams, tagOptions, assigneeOptions])

  const filteredActivities = useMemo(() => filterActivities(activities, filters), [activities, filters])
  const hasSheetFilters = filters.visibility !== 'active' || filters.status !== ALL_ACTIVITIES ||
    filters.team !== ALL_ACTIVITIES || filters.tag !== ALL_ACTIVITIES || filters.assignee !== ALL_ACTIVITIES

  return {
    filters,
    changeFilters: (patch: Partial<ActivityFilterState>) =>
      setFilters((current) => updateActivityFilters(current, patch)),
    resetFilters: () => setFilters(DEFAULT_ACTIVITY_FILTERS),
    filteredActivities,
    tagOptions,
    assigneeOptions,
    hasSheetFilters,
    hasActiveFilters: filters.name.trim() !== '' || hasSheetFilters,
    hasFinishedHidden: filters.visibility === 'active' && scopedActivities.some((activity) => activity.status === 'DONE'),
  }
}
