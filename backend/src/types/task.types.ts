import type { TaskStatus } from '../generated/client.js';

export interface TaskSummary {
  id: string;
  cardId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  estimatedHours: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends TaskSummary {
  loggedSeconds: number;
}
