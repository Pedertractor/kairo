import { TeamRole } from '../generated/client.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { TeamMemberSummary, TeamSummary, TeamUserOption } from '../types/team.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { AbsenceService } from './absence.service.js';

type TeamWithMembers = {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: Date;
  _count: { members: number };
  members: Array<{
    role: TeamRole;
    user: { id: string; name: string; absent: boolean };
  }>;
};

function toTeamMembers(
  members: TeamWithMembers['members'],
): TeamMemberSummary[] {
  return members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    role: member.role,
    absent: member.user.absent,
  }));
}

function toTeamSummary(team: TeamWithMembers, role: TeamRole): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    createdById: team.createdById,
    memberCount: team._count.members,
    members: toTeamMembers(team.members),
    role,
    createdAt: team.createdAt.toISOString(),
  };
}

export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly absenceService: AbsenceService,
  ) {}

  async listUserTeams(userId: string): Promise<TeamSummary[]> {
    const memberships = await this.teamRepository.findMembershipsByUserId(userId);

    return memberships.map((membership) =>
      toTeamSummary(membership.team, membership.role),
    );
  }

  async getTeamForMember(teamId: string, userId: string): Promise<TeamSummary> {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    if (!membership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    return toTeamSummary(membership.team, membership.role);
  }

  async removeMember(
    teamId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<TeamSummary> {
    const actorMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

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

    const actorMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

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
    const actorMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

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
    const actorMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

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
  ): Promise<TeamSummary> {
    const actorMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const targetMembership =
      await this.teamRepository.findMembershipByTeamAndUser(
        teamId,
        targetUserId,
      );

    if (!targetMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    await this.absenceService.setAbsent(targetUserId, absent);

    return this.getTeamForMember(teamId, actorUserId);
  }

  async listAvailableMembers(
    teamId: string,
    actorUserId: string,
  ): Promise<TeamUserOption[]> {
    const actorMembership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    if (actorMembership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

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

    return toTeamSummary(team, TeamRole.ADMIN);
  }
}
