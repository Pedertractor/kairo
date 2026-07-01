import type { CardStatus } from '../generated/client.js';

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

export interface ProjectSummary {
  id: string;
  teamId: string;
  teamName?: string;
  title: string;
  description: string | null;
  status: CardStatus;
  estimatedHours: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
