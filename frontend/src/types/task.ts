import type { MachineSummary } from '@/types/machine'

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED'

export interface TaskSummary {
  id: string
  cardId: string
  title: string
  description: string | null
  status: TaskStatus
  estimatedHours: string | null
  assignedToId: string | null
  assignedToName: string | null
  machine: MachineSummary | null
  sortOrder: number
  isFavorite: boolean
  createdById: string
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
}

export interface UpdateTaskInput {
  title?: string
  status?: TaskStatus
  machineId?: string | null
}
