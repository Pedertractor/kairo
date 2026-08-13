import type { PrismaClient, TeamRole } from '../generated/client.js';

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, absent: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  costCenters: {
    include: {
      costCenter: {
        select: { id: true, costCenter: true, description: true },
      },
    },
    orderBy: { costCenter: { costCenter: 'asc' as const } },
  },
  _count: { select: { members: true } },
};

export class TeamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMembershipsByUserId(userId: string) {
    return this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: memberInclude,
        },
      },
      orderBy: { team: { name: 'asc' } },
    });
  }

  findMembershipByTeamAndUser(teamId: string, userId: string) {
    return this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      include: {
        team: {
          include: memberInclude,
        },
      },
    });
  }

  findById(teamId: string) {
    return this.prisma.team.findUnique({
      where: { id: teamId },
    });
  }

  addMember(teamId: string, userId: string, role: TeamRole) {
    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
    });
  }

  countAdminsByTeamId(teamId: string) {
    return this.prisma.teamMember.count({
      where: { teamId, role: 'ADMIN' },
    });
  }

  deleteMember(teamId: string, userId: string) {
    return this.prisma.teamMember.delete({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
  }

  promoteToAdmin(teamId: string, userId: string) {
    return this.prisma.teamMember.update({
      where: {
        teamId_userId: { teamId, userId },
      },
      data: { role: 'ADMIN' },
    });
  }

  demoteAdmin(teamId: string, userId: string) {
    return this.prisma.teamMember.update({
      where: {
        teamId_userId: { teamId, userId },
      },
      data: { role: 'MEMBER' },
    });
  }

  updateTeam(
    teamId: string,
    data: {
      name?: string;
      description?: string | null;
    },
  ) {
    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
      },
      include: memberInclude,
    });
  }

  createTeamWithCreatorMember(
    name: string,
    description: string | undefined,
    createdById: string,
    creatorRole: TeamRole,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name,
          description: description || null,
          createdById,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: createdById,
          role: creatorRole,
        },
      });

      return tx.team.findUniqueOrThrow({
        where: { id: team.id },
        include: memberInclude,
      });
    });
  }
}
