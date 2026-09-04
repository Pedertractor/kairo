import { TeamRole } from '../generated/client.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { CostCenterSummary } from '../types/cost-center.types.js';
import type { TeamMemberSummary, TeamSummary, TeamUserOption } from '../types/team.types.js';
import { formatDateKey } from '../utils/app-timezone.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { assertTeamMembership } from '../utils/team-access.js';
import { AbsenceService } from './absence.service.js';

type TeamWithMembers = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  membersCanCreateActivities: boolean;
  membersCanCreateProjects: boolean;
  membersCanViewTimeline: boolean;
  createdById: string;
  createdAt: Date;
  _count: { members: number };
  members: Array<{
    role: TeamRole;
    user: { id: string; name: string; absent: boolean };
  }>;
  costCenters: Array<{
    costCenter: CostCenterSummary;
  }>;
};

function toTeamMembers(
  members: TeamWithMembers['members'],
  absenceStartedAtByUserId: Map<string, string>,
): TeamMemberSummary[] {
  return members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    role: member.role,
    absent: member.user.absent,
    absenceStartedAt: absenceStartedAtByUserId.get(member.user.id) ?? null,
  }));
}

function toTeamCostCenters(
  costCenters: TeamWithMembers['costCenters'],
): CostCenterSummary[] {
  return costCenters.map((link) => ({
    id: link.costCenter.id,
    costCenter: link.costCenter.costCenter,
    description: link.costCenter.description,
  }));
}

function toTeamSummary(
  team: TeamWithMembers,
  role: TeamRole,
  absenceStartedAtByUserId: Map<string, string>,
): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    createdById: team.createdById,
    memberCount: team._count.members,
    members: toTeamMembers(team.members, absenceStartedAtByUserId),
    costCenters: toTeamCostCenters(team.costCenters),
    role,
    active: team.active,
    membersCanCreateActivities: team.membersCanCreateActivities,
    membersCanCreateProjects: team.membersCanCreateProjects,
    membersCanViewTimeline: team.membersCanViewTimeline,
    createdAt: team.createdAt.toISOString(),
  };
}

export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly absenceService: AbsenceService,
    private readonly absenceRepository: AbsenceRepository,
    private readonly costCenterRepository: CostCenterRepository,
  ) {}

  private async loadAbsenceStartedAtByUserIds(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const periods = await this.absenceRepository.findCurrentStartedAtByUserIds(
      userIds,
    );
    const map = new Map<string, string>();

    for (const period of periods) {
      if (!map.has(period.userId)) {
        map.set(period.userId, formatDateKey(period.startedAt));
      }
    }

    return map;
  }

  private async requireTeamAdmin(
    teamId: string,
    actorUserId: string,
    options?: { forWrite?: boolean; allowInactiveAdmin?: boolean },
  ) {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );
    const actorMembership = assertTeamMembership(membership, options);

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    return actorMembership;
  }

  async listUserTeams(
    userId: string,
    active = true,
  ): Promise<TeamSummary[]> {
    const memberships = await this.teamRepository.findMembershipsByUserId(
      userId,
      { active, adminOnly: !active },
    );
    const memberIds = [
      ...new Set(
        memberships.flatMap((membership) =>
          membership.team.members.map((member) => member.user.id),
        ),
      ),
    ];
    const absenceStartedAtByUserId =
      await this.loadAbsenceStartedAtByUserIds(memberIds);

    return memberships.map((membership) =>
      toTeamSummary(membership.team, membership.role, absenceStartedAtByUserId),
    );
  }

  async getTeamForMember(teamId: string, userId: string): Promise<TeamSummary> {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    const allowed = assertTeamMembership(membership, {
      allowInactiveAdmin: true,
    });

    const absenceStartedAtByUserId = await this.loadAbsenceStartedAtByUserIds(
      allowed.team.members.map((member) => member.user.id),
    );

    return toTeamSummary(
      allowed.team,
      allowed.role,
      absenceStartedAtByUserId,
    );
  }

  async setTeamActive(
    teamId: string,
    actorUserId: string,
    active: boolean,
  ): Promise<TeamSummary> {
    const actorMembership = await this.requireTeamAdmin(teamId, actorUserId, {
      allowInactiveAdmin: true,
    });

    if (actorMembership.team.active === active) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    await this.teamRepository.setActive(teamId, active);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async removeMember(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<TeamSummary> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    const targetMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (targetMembership.role === TeamRole.ADMIN) {
      const adminCount = await this.teamRepository.countAdminsByTeamId(teamId);

      if (adminCount <= 1) {
        throw new AppError(400, MENSAGENS.ULTIMO_ADMIN_NAO_PODE_SER_REMOVIDO);
      }
    }

    await this.teamRepository.deleteMember(teamId, targetUserId);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async promoteAdmin(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<TeamSummary> {
    if (actorUserId === targetUserId) {
      throw new AppError(400, MENSAGENS.NAO_PODE_PROMOVER_SI_MESMO);
    }

    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    const targetMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (targetMembership.role === TeamRole.ADMIN) {
      throw new AppError(400, MENSAGENS.MEMBRO_JA_E_ADMIN);
    }

    await this.teamRepository.promoteToAdmin(teamId, targetUserId);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async demoteAdmin(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<TeamSummary> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    const targetMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (targetMembership.role !== TeamRole.ADMIN) {
      throw new AppError(400, MENSAGENS.MEMBRO_NAO_E_ADMIN);
    }

    const adminCount = await this.teamRepository.countAdminsByTeamId(teamId);

    if (adminCount <= 1) {
      throw new AppError(400, MENSAGENS.ULTIMO_ADMIN_NAO_PODE_SER_REBAIXADO);
    }

    await this.teamRepository.demoteAdmin(teamId, targetUserId);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async addMember(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<TeamSummary> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser || !targetUser.active) {
      throw new AppError(404, MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    const existingMembership =
      await this.teamRepository.findMembershipByTeamAndUser(
        teamId,
        targetUser.id,
      );

    if (existingMembership) {
      throw new AppError(400, MENSAGENS.USUARIO_JA_E_MEMBRO);
    }

    await this.teamRepository.addMember(teamId, targetUser.id, TeamRole.MEMBER);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async updateMemberAbsent(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
    absent: boolean,
    options?: { startDate?: string; endDate?: string | null },
  ): Promise<TeamSummary> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    const targetMembership =
      await this.teamRepository.findMembershipByTeamAndUser(
        teamId,
        targetUserId,
      );

    if (!targetMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    await this.absenceService.setAbsent(targetUserId, absent, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      createdById: actorUserId,
    });

    return this.getTeamForMember(teamId, actorUserId);
  }

  async listAvailableMembers(
    teamId: string,
    actorUserId: string,
  ): Promise<TeamUserOption[]> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    return this.userRepository.findAvailableForTeam(teamId);
  }

  async createTeam(
    userId: string,
    name: string,
    description?: string,
  ): Promise<TeamSummary> {
    const team = await this.teamRepository.createTeamWithCreatorMember(
      name,
      description,
      userId,
      TeamRole.ADMIN,
    );

    return this.getTeamForMember(team.id, userId);
  }

  async updateTeam(
    teamId: string,
    actorUserId: string,
    data: {
      name?: string;
      description?: string | null;
      membersCanCreateActivities?: boolean;
      membersCanCreateProjects?: boolean;
      membersCanViewTimeline?: boolean;
    },
  ): Promise<TeamSummary> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    await this.teamRepository.updateTeam(teamId, data);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async listTeamCostCenters(
    teamId: string,
    actorUserId: string,
  ): Promise<CostCenterSummary[]> {
    const team = await this.getTeamForMember(teamId, actorUserId);
    return team.costCenters;
  }

  async setTeamCostCenters(
    teamId: string,
    actorUserId: string,
    costCenterIds: string[],
  ): Promise<TeamSummary> {
    await this.requireTeamAdmin(teamId, actorUserId, { forWrite: true });

    const uniqueIds = [...new Set(costCenterIds)];

    if (uniqueIds.length > 0) {
      const found = await this.costCenterRepository.findByIds(uniqueIds);

      if (found.length !== uniqueIds.length) {
        throw new AppError(400, MENSAGENS.CENTRO_CUSTO_NAO_ENCONTRADO);
      }
    }

    await this.costCenterRepository.replaceTeamCostCenters(teamId, uniqueIds);

    return this.getTeamForMember(teamId, actorUserId);
  }
}
