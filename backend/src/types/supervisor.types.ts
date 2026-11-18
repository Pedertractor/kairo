import type { CostCenterShift } from '../utils/cost-center-hierarchy.js';

export interface SupervisorSummary {
  id: string;
  name: string;
  unit: string;
  cardNumber: string;
}

export interface SupervisorLeaderSummary {
  /** Kairo user id; null when the leader has no Kairo account yet. */
  userId: string | null;
  cardNumber: string;
  name: string;
  unit: string | null;
  registered: boolean;
  shifts: CostCenterShift[];
  costCenters: Array<{
    costCenter: string;
    description: string;
    group: string | null;
  }>;
  teamCount: number;
  memberCount: number;
}
