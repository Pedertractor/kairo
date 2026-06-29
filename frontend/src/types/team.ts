export type TeamRole = 'ADMIN' | 'MEMBER'

export interface TeamSummary {
  id: string
  name: string
  description: string | null
  createdById: string
  memberCount: number
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
