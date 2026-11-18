import type { TeamSummary } from '@/types/team'

type ReadOnlyAware = Partial<Pick<TeamSummary, 'viewerAccess'>>

/** Supervisors (and admins) seeing a team through the hierarchy can look, never edit. */
export function isReadOnlyTeam(team: ReadOnlyAware) {
  return team.viewerAccess === 'readonly'
}

/** Team admin with real membership: may manage members, settings and documents. */
export function canManageTeam(team: Pick<TeamSummary, 'role'> & ReadOnlyAware) {
  return team.role === 'ADMIN' && !isReadOnlyTeam(team)
}

export function canDeleteTeamCard(
  team: Pick<TeamSummary, 'role' | 'membersCanDeleteCards'> & ReadOnlyAware,
  createdById: string,
  userId: string | undefined,
) {
  if (isReadOnlyTeam(team)) return false
  return team.role === 'ADMIN' || team.membersCanDeleteCards || createdById === userId
}

export function canCreateTeamActivities(
  team: Pick<TeamSummary, 'role' | 'membersCanCreateActivities'> & ReadOnlyAware,
) {
  if (isReadOnlyTeam(team)) return false
  return team.role === 'ADMIN' || team.membersCanCreateActivities
}

export function canEditTeamActivities(
  team: Pick<TeamSummary, 'role' | 'membersCanEditActivities'> & ReadOnlyAware,
) {
  if (isReadOnlyTeam(team)) return false
  return team.role === 'ADMIN' || team.membersCanEditActivities
}

export function canChangeActivityStatus(
  team: Pick<TeamSummary, 'role' | 'membersCanEditActivities'> & ReadOnlyAware,
  assignedToId: string | null | undefined,
  userId: string | undefined,
) {
  if (isReadOnlyTeam(team)) return false
  return (
    team.role === 'ADMIN' ||
    team.membersCanEditActivities ||
    (userId !== undefined && assignedToId === userId)
  )
}

export function canCreateTeamProjects(
  team: Pick<TeamSummary, 'role' | 'membersCanCreateProjects'> & ReadOnlyAware,
) {
  if (isReadOnlyTeam(team)) return false
  return team.role === 'ADMIN' || team.membersCanCreateProjects
}

/** Viewing only: read-only views keep every admin-level read (timeline included). */
export function canViewTeamTimeline(
  team: Pick<TeamSummary, 'role' | 'membersCanViewTimeline'>,
) {
  return team.role === 'ADMIN' || team.membersCanViewTimeline
}

export function canEditTeamTags(
  team: Pick<TeamSummary, 'role' | 'membersCanEditTags'> & ReadOnlyAware,
) {
  if (isReadOnlyTeam(team)) return false
  return team.role === 'ADMIN' || team.membersCanEditTags
}

export function canDeleteTeamTags(
  team: Pick<TeamSummary, 'role' | 'membersCanDeleteTags'> & ReadOnlyAware,
) {
  if (isReadOnlyTeam(team)) return false
  return team.role === 'ADMIN' || team.membersCanDeleteTags
}
