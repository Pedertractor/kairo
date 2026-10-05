export type CardHistoryEventType = 'ASSIGNEE_CHANGED';

export interface ActivityHistoryEvent {
  id: string;
  cardId: string;
  type: CardHistoryEventType;
  changedById: string;
  changedByName: string;
  fromAssignedToId: string | null;
  fromAssignedToName: string | null;
  toAssignedToId: string | null;
  toAssignedToName: string | null;
  createdAt: string;
}
