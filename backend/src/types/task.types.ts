import type { TaskStatus } from '../generated/client.js';

export interface TaskMachineSummary {
  id: string;
  name: string;
  costCenter: string;
}

export interface TaskSummary {
  id: string;
  cardId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  estimatedHours: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  machine: TaskMachineSummary | null;
  sortOrder: number;
  isFavorite: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends TaskSummary {
  loggedSeconds: number;
}
