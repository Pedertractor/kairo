import type { TeamRole } from '../generated/client.js';

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  memberCount: number;
  role: TeamRole;
  createdAt: string;
}
