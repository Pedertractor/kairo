import type { ActivitySummary, CardStatus } from '@/types/card'
import type { ActivityTag } from '@/types/tag'

export type ActivityTagFilterOption = ActivityTag & { teamId?: string }

export const ALL_ACTIVITIES = '__all__'
export const UNASSIGNED = '__unassigned__'
export type ActivityVisibility = 'active' | 'all'

export interface ActivityFilterState {
  name: string
  visibility: ActivityVisibility
  status: CardStatus | typeof ALL_ACTIVITIES
  team: string
  tag: string
  assignee: string
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilterState = {
  name: '',
  visibility: 'active',
  status: ALL_ACTIVITIES,
  team: ALL_ACTIVITIES,
  tag: ALL_ACTIVITIES,
  assignee: ALL_ACTIVITIES,
}

export function getActivityTagOptions(
  activities: ActivitySummary[],
  tags: ActivityTagFilterOption[],
  teams: { id: string; name: string }[],
  teamFilter: string,
) {
  const byId = new Map<string, ActivityTagFilterOption>()
  for (const tag of tags) {
    if (teamFilter === ALL_ACTIVITIES || tag.teamId === teamFilter) {
      byId.set(tag.id, tag)
    }
  }
  for (const activity of activities) {
    if ((teamFilter === ALL_ACTIVITIES || activity.teamId === teamFilter) &&
      activity.tag && !byId.has(activity.tag.id)) {
      byId.set(activity.tag.id, { ...activity.tag, teamId: activity.teamId })
    }
  }
  const options = [...byId.values()]
  return options.map((tag) => {
    const team = teams.find((item) => item.id === tag.teamId)
    const homonym = options.some((other) => other.id !== tag.id && other.name === tag.name)
    return { ...tag, name: homonym && team ? `${tag.name} (${team.name})` : tag.name }
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function updateActivityFilters(
  current: ActivityFilterState,
  patch: Partial<ActivityFilterState>,
): ActivityFilterState {
  const next = { ...current, ...patch }
  if (patch.team !== undefined && patch.team !== current.team) {
    next.tag = ALL_ACTIVITIES
    next.assignee = ALL_ACTIVITIES
  }
  if (patch.status === 'DONE') next.visibility = 'all'
  if (patch.visibility === 'active' && next.status === 'DONE') {
    next.status = ALL_ACTIVITIES
  }
  return next
}

export function filterActivities(
  activities: ActivitySummary[],
  filters: ActivityFilterState,
) {
  const query = filters.name.trim().toLowerCase()
  return activities.filter((activity) =>
    (filters.visibility === 'all' || activity.status !== 'DONE') &&
    (query === '' || activity.title.toLowerCase().includes(query)) &&
    (filters.status === ALL_ACTIVITIES || activity.status === filters.status) &&
    (filters.team === ALL_ACTIVITIES || activity.teamId === filters.team) &&
    (filters.tag === ALL_ACTIVITIES || activity.tag?.id === filters.tag) &&
    (filters.assignee === ALL_ACTIVITIES ||
      (filters.assignee === UNASSIGNED
        ? !activity.assignedToId
        : activity.assignedToId === filters.assignee)),
  )
}
