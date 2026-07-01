import type { TaskStatus } from '@/types/task'

export const TASK_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'CANCELED',
]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluída',
  CANCELED: 'Cancelada',
}
