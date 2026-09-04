import type { TeamSummary } from '@/types/team'

export function canCreateTeamActivities(
  team: Pick<TeamSummary, 'role' | 'membersCanCreateActivities'>,
) {
  return team.role === 'ADMIN' || team.membersCanCreateActivities
}

export function canCreateTeamProjects(
  team: Pick<TeamSummary, 'role' | 'membersCanCreateProjects'>,
) {
  return team.role === 'ADMIN' || team.membersCanCreateProjects
}

export function canViewTeamTimeline(
  team: Pick<TeamSummary, 'role' | 'membersCanViewTimeline'>,
) {
  return team.role === 'ADMIN' || team.membersCanViewTimeline
}
