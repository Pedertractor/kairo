import type { TeamRole, UnitType } from '../generated/client.js';
import type { CostCenterSummary } from './cost-center.types.js';

export interface TeamMemberSummary {
  id: string;
  name: string;
  role: TeamRole;
  absent: boolean;
  absenceStartedAt: string | null;
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
  costCenters: CostCenterSummary[];
  role: TeamRole;
  active: boolean;
  membersCanCreateActivities: boolean;
  membersCanCreateProjects: boolean;
  membersCanViewTimeline: boolean;
  createdAt: string;
}
