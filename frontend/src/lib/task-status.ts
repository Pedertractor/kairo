import type { TaskStatus } from '@/types/task'

export const TASK_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausada',
  DONE: 'Concluída',
  CANCELED: 'Cancelada',
}

export const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  TODO: 'rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground',
  IN_PROGRESS:
    'rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[11px] text-sky-700 dark:text-sky-300',
  PAUSED:
    'rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300',
  DONE: 'rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300',
  CANCELED:
    'rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-700 dark:text-rose-300',
}
