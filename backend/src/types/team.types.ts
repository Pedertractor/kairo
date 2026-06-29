import type { TeamRole } from '../generated/client.js';

export interface TeamMemberSummary {
  id: string;
  name: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  memberCount: number;
  members: TeamMemberSummary[];
  role: TeamRole;
  createdAt: string;
}
