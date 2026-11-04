import type { CardStatus } from './card'

export type CardHistoryEventType = 'ASSIGNEE_CHANGED' | 'STATUS_CHANGED'

export interface ActivityHistoryEvent {
  id: string
  cardId: string
  type: CardHistoryEventType
  changedById: string
  changedByName: string
  fromAssignedToId: string | null
  fromAssignedToName: string | null
  toAssignedToId: string | null
  toAssignedToName: string | null
  fromStatus: CardStatus | null
  toStatus: CardStatus | null
  createdAt: string
}

export interface ActivityHistoryResponse {
  history: ActivityHistoryEvent[]
}
