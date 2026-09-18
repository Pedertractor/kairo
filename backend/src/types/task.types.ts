import type { ComplexityLevel, TaskStatus } from '../generated/client.js';

export interface TaskTagSummary {
  id: string;
  name: string;
  color: string;
}

export interface TaskMachineSummary {
  id: string;
  name: string;
  costCenter: string;
}

export interface TaskSummary {
  id: string;
  cardId: string;
  teamId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  complexityLevel: ComplexityLevel | null;
  estimatedHours: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  tag: TaskTagSummary | null;
  machine: TaskMachineSummary | null;
  sortOrder: number;
  isFavorite: boolean;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends TaskSummary {
  loggedSeconds: number;
}
