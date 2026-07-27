import type { UnitType } from '@/types/auth'

export type TeamRole = 'ADMIN' | 'MEMBER'

export interface TeamMemberSummary {
  id: string
  name: string
  role: TeamRole
  absent: boolean
}

export interface TeamSummary {
  id: string
  name: string
  description: string | null
  createdById: string
  memberCount: number
  members: TeamMemberSummary[]
  role: TeamRole
  createdAt: string
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
