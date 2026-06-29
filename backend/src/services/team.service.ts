import { TeamRole } from '../generated/client.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type { TeamMemberSummary, TeamSummary } from '../types/team.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

type TeamWithMembers = {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: Date;
  _count: { members: number };
  members: Array<{
    user: { id: string; name: string };
  }>;
};

function toTeamMembers(
  members: TeamWithMembers['members'],
): TeamMemberSummary[] {
  return members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
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
  constructor(private readonly teamRepository: TeamRepository) {}

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
