import type { CardStatus, ProjectSummary } from '@/types/card'

export const ALL_PROJECT_STATUSES = 'ALL'
export type ProjectStatusFilter = CardStatus | typeof ALL_PROJECT_STATUSES
export type ProjectOrder = 'newest' | 'oldest' | 'name-asc' | 'name-desc'

const STATUS_ORDER: Record<CardStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  PAUSED: 2,
  DONE: 3,
  CANCELED: 4,
}

type SortableProject = Pick<ProjectSummary, 'id' | 'title' | 'status' | 'createdAt'>

export function filterAndSortTeamProjects<T extends SortableProject>(
  projects: readonly T[],
  status: ProjectStatusFilter = ALL_PROJECT_STATUSES,
  order: ProjectOrder = 'newest',
): T[] {
  return projects
    .filter((project) => status === ALL_PROJECT_STATUSES || project.status === status)
    .sort((a, b) => {
      const statusDifference = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (statusDifference !== 0) return statusDifference

      const titleDifference = a.title.localeCompare(b.title, 'pt-BR')
      const orderDifference = order === 'name-asc'
        ? titleDifference
        : order === 'name-desc'
          ? -titleDifference
          : order === 'oldest'
            ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
            : Date.parse(b.createdAt) - Date.parse(a.createdAt)

      return orderDifference || titleDifference || a.id.localeCompare(b.id)
    })
}
