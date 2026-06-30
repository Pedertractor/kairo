import type { CardStatus } from '@/types/card'

export const CARD_STATUSES: CardStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
]

export const STATUS_LABELS: Record<CardStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  DONE: 'Concluído',
  CANCELED: 'Cancelado',
}
