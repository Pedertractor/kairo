import type { TeamSummary } from '@/types/team'

export function canCreateTeamActivities(
  team: Pick<TeamSummary, 'role' | 'membersCanCreateActivities'>,
) {
  return team.role === 'ADMIN' || team.membersCanCreateActivities
}

export function canEditTeamActivities(
  team: Pick<TeamSummary, 'role' | 'membersCanEditActivities'>,
) {
  return team.role === 'ADMIN' || team.membersCanEditActivities
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

export function canEditTeamTags(
  team: Pick<TeamSummary, 'role' | 'membersCanEditTags'>,
) {
  return team.role === 'ADMIN' || team.membersCanEditTags
}

export function canDeleteTeamTags(
  team: Pick<TeamSummary, 'role' | 'membersCanDeleteTags'>,
) {
  return team.role === 'ADMIN' || team.membersCanDeleteTags
}
