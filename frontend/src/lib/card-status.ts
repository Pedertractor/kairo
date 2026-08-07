import type { CardStatus } from '@/types/card'

export const CARD_STATUSES: CardStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
]

export function isFinishedStatus(status: CardStatus) {
  return status === 'DONE'
}

export function canFinishStatus(status: CardStatus) {
  return status !== 'DONE' && status !== 'CANCELED'
}

export const STATUS_LABELS: Record<CardStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  DONE: 'Concluído',
  CANCELED: 'Cancelado',
}

export const CARD_STATUS_CARD_CLASS: Record<CardStatus, string> = {
  TODO: 'border-border bg-card',
  IN_PROGRESS:
    'border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
  PAUSED:
    'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
  DONE: 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/60 dark:bg-emerald-950/25',
  CANCELED:
    'border-rose-200 bg-rose-50/65 dark:border-rose-900/60 dark:bg-rose-950/20',
}

export const CARD_STATUS_BADGE_CLASS: Record<CardStatus, string> = {
  TODO: 'rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground',
  IN_PROGRESS:
    'rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-700 transition-colors hover:bg-sky-500/15 dark:text-sky-300',
  PAUSED:
    'rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300',
  DONE: 'rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300',
  CANCELED:
    'rounded-md bg-rose-500/10 px-2 py-0.5 text-xs text-rose-700 transition-colors hover:bg-rose-500/15 dark:text-rose-300',
}
