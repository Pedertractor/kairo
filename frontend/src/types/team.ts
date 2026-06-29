export type TeamRole = 'ADMIN' | 'MEMBER'

export interface TeamMemberSummary {
  id: string
  name: string
  role: TeamRole
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
