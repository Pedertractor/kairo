import { TeamRole } from '../generated/client.js';
import type { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import type {
  AdminDashboardLeader,
  AdminDashboardLeaderMember,
} from '../types/admin-dashboard.types.js';
import type { AdminTeamsDayDashboard } from '../types/time-entry.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import type { TimeEntryService } from './time-entry.service.js';

type LeaderRow = Awaited<
  ReturnType<AdminDashboardRepository['findTeamLeaders']>
>[number];

/**
 * Collaborators of a leader's teams, with the same rule as the team-admin
 * timeline: plain members only, never someone who admins one of those teams.
 */
function collectMembers(leader: LeaderRow): AdminDashboardLeaderMember[] {
  const teams = leader.memberships.map((membership) => membership.team);
  const adminIds = new Set(
    teams.flatMap((team) =>
      team.members
        .filter((member) => member.role === TeamRole.ADMIN)
        .map((member) => member.user.id),
    ),
  );
  const members = new Map<string, AdminDashboardLeaderMember>();

  for (const team of teams) {
    for (const member of team.members) {
      if (member.role !== TeamRole.MEMBER || adminIds.has(member.user.id)) {
        continue;
      }

      members.set(member.user.id, member.user);
    }
  }

  return [...members.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'pt-BR'),
  );
}

/** Admin panel view of the collaborators and day timeline of each leader / supervisor. */
export class AdminLeaderTimelineService {
  constructor(
    private readonly repository: Pick<AdminDashboardRepository, 'findTeamLeaders'>,
    private readonly timeEntryService: Pick<
      TimeEntryService,
      'getAdminTeamsDayDashboard'
    >,
  ) {}

  async listLeaders(): Promise<AdminDashboardLeader[]> {
    const leaders = await this.repository.findTeamLeaders();

    return leaders.map((leader) => ({
      id: leader.id,
      name: leader.name,
      role: leader.role as AdminDashboardLeader['role'],
      teamCount: leader.memberships.length,
      members: collectMembers(leader),
    }));
  }

  /** The day timeline of every collaborator of the leader, or just `userId`. */
  async getLeaderDay(
    leaderId: string,
    date?: string,
    userId?: string,
  ): Promise<AdminTeamsDayDashboard> {
    const [leader] = await this.repository.findTeamLeaders(leaderId);

    if (!leader) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    return this.timeEntryService.getAdminTeamsDayDashboard(
      leader.id,
      date,
      undefined,
      userId,
    );
  }
}
