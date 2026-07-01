export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'

export interface TaskSummary {
  id: string
  cardId: string
  title: string
  description: string | null
  status: TaskStatus
  estimatedHours: string | null
  assignedToId: string | null
  assignedToName: string | null
  sortOrder: number
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

export interface CreateTaskInput {
  title: string
  description?: string
  estimatedHours?: number
}
