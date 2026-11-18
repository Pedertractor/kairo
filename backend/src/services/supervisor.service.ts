import { UserRole } from '../generated/client.js';
import {
  HierarchyRepository,
  type ResolvedLeader,
} from '../repositories/hierarchy.repository.js';
import type {
  SupervisorLeaderSummary,
  SupervisorSummary,
} from '../types/supervisor.types.js';
import type { TeamSummary } from '../types/team.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import type { TeamService } from './team.service.js';

type HierarchyUser = NonNullable<
  Awaited<ReturnType<HierarchyRepository['findUserById']>>
>;

export class SupervisorService {
  constructor(
    private readonly hierarchyRepository: Pick<
      HierarchyRepository,
      | 'findUserById'
      | 'findSupervisors'
      | 'findLeadersOfSupervisor'
      | 'findTeamsOwnedBy'
    >,
    private readonly teamService: Pick<TeamService, 'listTeamsOwnedBy'>,
  ) {}

  /** Supervisors always get their own view; admins pick a supervisor explicitly. */
  private async resolveSupervisor(
    actorUserId: string,
    supervisorId?: string,
  ): Promise<HierarchyUser> {
    const actor = await this.hierarchyRepository.findUserById(actorUserId);

    if (!actor?.active) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (actor.role === UserRole.SUPERVISOR) {
      return actor;
    }

    if (actor.role !== UserRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (!supervisorId) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    const supervisor = await this.hierarchyRepository.findUserById(supervisorId);

    if (!supervisor?.active) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    return supervisor;
  }

  async listSupervisors(): Promise<SupervisorSummary[]> {
    const supervisors = await this.hierarchyRepository.findSupervisors();
    return supervisors.map(({ id, name, unit, cardNumber }) => ({
      id,
      name,
      unit,
      cardNumber,
    }));
  }

  async listLeaders(
    actorUserId: string,
    supervisorId?: string,
  ): Promise<SupervisorLeaderSummary[]> {
    const supervisor = await this.resolveSupervisor(actorUserId, supervisorId);
    const leaders = await this.hierarchyRepository.findLeadersOfSupervisor({
      unit: supervisor.unit,
      card: supervisor.cardNumber,
    });
    const userIds = leaders.flatMap((leader) =>
      leader.user ? [leader.user.id] : [],
    );
    const owned = await this.hierarchyRepository.findTeamsOwnedBy(userIds);
    const teamsByLeader = new Map<string, Set<string>>();
    const membersByLeader = new Map<string, Set<string>>();

    for (const row of owned) {
      const teams = teamsByLeader.get(row.userId) ?? new Set<string>();
      const members = membersByLeader.get(row.userId) ?? new Set<string>();
      teams.add(row.team.id);

      for (const member of row.team.members) {
        if (member.userId !== row.userId) {
          members.add(member.userId);
        }
      }

      teamsByLeader.set(row.userId, teams);
      membersByLeader.set(row.userId, members);
    }

    return leaders.map((leader: ResolvedLeader) => {
      const userId = leader.user?.id ?? null;

      return {
        userId,
        cardNumber: leader.leaderCard,
        name: leader.user?.name ?? leader.leaderName ?? leader.leaderCard,
        unit: leader.user?.unit ?? leader.leaderUnit,
        registered: leader.user !== null,
        shifts: leader.shifts,
        costCenters: leader.costCenters,
        teamCount: userId ? (teamsByLeader.get(userId)?.size ?? 0) : 0,
        memberCount: userId ? (membersByLeader.get(userId)?.size ?? 0) : 0,
      };
    });
  }

  async listLeaderTeams(
    actorUserId: string,
    leaderUserId: string,
    supervisorId?: string,
  ): Promise<{ leader: SupervisorLeaderSummary; teams: TeamSummary[] }> {
    const leaders = await this.listLeaders(actorUserId, supervisorId);
    const leader = leaders.find((item) => item.userId === leaderUserId);

    if (!leader) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    const teams = await this.teamService.listTeamsOwnedBy(leaderUserId);
    return { leader, teams };
  }
}
