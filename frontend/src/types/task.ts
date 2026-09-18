import type { ComplexityLevel } from '@/lib/complexity-level'
import type { MachineSummary } from '@/types/machine'
import type { ActivityTag } from '@/types/tag'

export type { ComplexityLevel }

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED'

export interface TaskSummary {
  id: string
  cardId: string
  teamId: string
  title: string
  description: string | null
  status: TaskStatus
  complexityLevel: ComplexityLevel | null
  estimatedHours: string | null
  assignedToId: string | null
  assignedToName: string | null
  tag: ActivityTag | null
  machine: MachineSummary | null
  sortOrder: number
  isFavorite: boolean
  createdById: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface TasksListResponse {
  tasks: TaskSummary[]
}

export interface TaskResponse {
  task: TaskSummary
}

export interface TaskDetail extends TaskSummary {
  loggedSeconds: number
}

export interface TaskDetailResponse {
  task: TaskDetail
}

export interface CreateTaskInput {
  title: string
  description?: string
  estimatedHours?: number
  machineId?: string
  complexityLevel?: ComplexityLevel
  tagId?: string
}

export interface UpdateTaskInput {
  title?: string
  status?: TaskStatus
  description?: string | null
  machineId?: string | null
  assignedToId?: string | null
  tagId?: string | null
  complexityLevel?: ComplexityLevel | null
  estimatedHours?: number | null
}
