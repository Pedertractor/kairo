import type { ComplexityLevel } from '@/lib/complexity-level'
import type { ClientSummary } from '@/types/client'
import type { MachineSummary } from '@/types/machine'
import type { ActivityTag } from '@/types/tag'

export type { ActivityTag, ComplexityLevel }

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
  complexityLevel: ComplexityLevel | null
  estimatedHours: string | null
  loggedSeconds: number
  isFavorite: boolean
  tag: ActivityTag | null
  client: ClientSummary | null
  machine: MachineSummary | null
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
  clientId?: string
  machineId?: string
  complexityLevel?: ComplexityLevel
}

export interface UpdateActivityStatusInput {
  status: CardStatus
}

export interface UpdateActivityInput {
  title?: string
  status?: CardStatus
  tagId?: string | null
  description?: string | null
  estimatedHours?: number | null
  clientId?: string | null
  machineId?: string | null
  complexityLevel?: ComplexityLevel | null
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
  description?: string | null
  estimatedHours?: number | null
}
