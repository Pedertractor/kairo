import type { TeamRole, UnitType } from '../generated/client.js';

export interface TeamMemberSummary {
  id: string;
  name: string;
  role: TeamRole;
  absent: boolean;
}

export interface TeamUserOption {
  id: string;
  name: string;
  employeeId: string;
  unit: UnitType;
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
