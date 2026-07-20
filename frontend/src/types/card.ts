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
  loggedSeconds: number;
  isFavorite: boolean;
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

export interface UpdateActivityInput {
  title?: string;
  status?: CardStatus;
}

export interface ProjectSummary {
  id: string;
  teamId: string;
  teamName?: string;
  title: string;
  description: string | null;
  status: CardStatus;
  estimatedHours: string | null;
  loggedSeconds: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsListResponse {
  projects: ProjectSummary[];
}

export interface ProjectResponse {
  project: ProjectSummary;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  estimatedHours?: number;
}

export interface UpdateProjectStatusInput {
  status: CardStatus;
}
