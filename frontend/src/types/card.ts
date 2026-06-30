export type CardStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED';

export interface ActivitySummary {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  status: CardStatus;
  estimatedHours: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivitiesListResponse {
  activities: ActivitySummary[];
}

export interface ActivityResponse {
  activity: ActivitySummary;
}

export interface CreateActivityInput {
  title: string;
  description?: string;
  estimatedHours?: number;
}

export interface UpdateActivityStatusInput {
  status: CardStatus;
}
