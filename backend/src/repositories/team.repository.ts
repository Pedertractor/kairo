import type { PrismaClient, TeamRole } from '../generated/client.js';

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
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
