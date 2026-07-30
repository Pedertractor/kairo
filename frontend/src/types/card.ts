import type { ActivityTag } from '@/types/tag'

export type { ActivityTag }

export type CardStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED'

export interface ActivitySummary {
  id: string
  teamId: string
  title: string
  description: string | null
  status: CardStatus
  estimatedHours: string | null
  loggedSeconds: number
  isFavorite: boolean
  tag: ActivityTag | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ActivitiesListResponse {
  activities: ActivitySummary[]
}

export interface ActivityResponse {
  activity: ActivitySummary
}

export interface CreateActivityInput {
  title: string
  description?: string
  estimatedHours?: number
  tagId?: string
}

export interface UpdateActivityStatusInput {
  status: CardStatus
}

export interface UpdateActivityInput {
  title?: string
  status?: CardStatus
  tagId?: string | null
}

export interface ProjectSummary {
  id: string
  teamId: string
  teamName?: string
  title: string
  description: string | null
  status: CardStatus
  estimatedHours: string | null
  loggedSeconds: number
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ProjectsListResponse {
  projects: ProjectSummary[]
}

export interface ProjectResponse {
  project: ProjectSummary
}

export interface CreateProjectInput {
  title: string
  description?: string
  estimatedHours?: number
}

export interface UpdateProjectStatusInput {
  status: CardStatus
}

export interface UpdateProjectInput {
  title?: string
  status?: CardStatus
}
