import type { CardStatus } from './card'

export type CardHistoryEventType = 'ASSIGNEE_CHANGED' | 'STATUS_CHANGED' | 'COMPLETION_ESTIMATED'

export interface ActivityHistoryEvent {
  id: string
  cardId: string
  type: CardHistoryEventType
  changedById: string | null
  changedByName: string | null
  fromAssignedToId: string | null
  fromAssignedToName: string | null
  toAssignedToId: string | null
  toAssignedToName: string | null
  fromStatus: CardStatus | null
  toStatus: CardStatus | null
  estimatedCompletedAt: string | null
  createdAt: string
}

export interface ActivityHistoryResponse {
  history: ActivityHistoryEvent[]
}
