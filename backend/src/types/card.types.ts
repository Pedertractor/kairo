import type { CardStatus, ComplexityLevel } from '../generated/client.js';

export interface ActivityTagSummary {
  id: string;
  name: string;
  color: string;
}

export interface ActivityClientSummary {
  id: string;
  name: string;
}

export interface ActivityMachineSummary {
  id: string;
  name: string;
  costCenter: string;
}

export interface ActivitySummary {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  status: CardStatus;
  complexityLevel: ComplexityLevel | null;
  estimatedHours: string | null;
  loggedSeconds: number;
  isFavorite: boolean;
  tag: ActivityTagSummary | null;
  client: ActivityClientSummary | null;
  machine: ActivityMachineSummary | null;
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
  loggedSeconds: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
