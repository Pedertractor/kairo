import type { CostCenterSummary } from '@/types/cost-center'
import type { UnitType } from '@/types/auth'

export type TeamRole = 'ADMIN' | 'MEMBER'

export interface TeamMemberSummary {
  id: string
  name: string
  role: TeamRole
  absent: boolean
  absenceStartedAt: string | null
  absenceEndedAt: string | null
  shiftStart: string | null
  shiftEnd: string | null
}

export interface TeamSummary {
  id: string
  name: string
  description: string | null
  createdById: string
  memberCount: number
  members: TeamMemberSummary[]
  costCenters: CostCenterSummary[]
  role: TeamRole
  active: boolean
  membersCanCreateActivities: boolean
  membersCanCreateProjects: boolean
  membersCanViewTimeline: boolean
  membersCanEditActivities: boolean
  membersCanEditTags: boolean
  membersCanDeleteTags: boolean
  membersCanDeleteCards: boolean
  createdAt: string
  /** 'readonly' when access comes from the supervisor hierarchy (or system admin), not membership. */
  viewerAccess?: 'member' | 'readonly'
}

export type TeamShift = 'DAY' | 'NIGHT'

export interface SupervisorLeaderSummary {
  /** Kairo user id; null when the leader has no Kairo account yet. */
  userId: string | null
  cardNumber: string
  name: string
  unit: UnitType | null
  registered: boolean
  shifts: TeamShift[]
  costCenters: Array<{
    costCenter: string
    description: string
    group: string | null
  }>
  teamCount: number
  memberCount: number
}

export interface SupervisorLeadersResponse {
  leaders: SupervisorLeaderSummary[]
}

export interface SupervisorLeaderTeamsResponse {
  leader: SupervisorLeaderSummary
  teams: TeamSummary[]
}

export interface TeamsListResponse {
  teams: TeamSummary[]
}

export interface TeamResponse {
  team: TeamSummary
}

export interface CreateTeamInput {
  name: string
  description?: string
}

export interface UpdateTeamInput {
  name?: string
  description?: string | null
  membersCanCreateActivities?: boolean
  membersCanCreateProjects?: boolean
  membersCanViewTimeline?: boolean
  membersCanEditActivities?: boolean
  membersCanEditTags?: boolean
  membersCanDeleteTags?: boolean
  membersCanDeleteCards?: boolean
}

export interface AddTeamMemberInput {
  userId: string
}

export interface TeamUserOption {
  id: string
  name: string
  employeeId: string
  unit: UnitType
}

export interface AvailableTeamMembersResponse {
  users: TeamUserOption[]
}
