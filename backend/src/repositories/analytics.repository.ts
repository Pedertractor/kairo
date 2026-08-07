import type { PrismaClient } from '../generated/client.js';

export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOwnedTeams(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: {
          some: { userId, role: 'ADMIN' },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        members: {
          where: { role: 'MEMBER', user: { absent: false } },
          orderBy: { user: { name: 'asc' } },
          select: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  findProjectsForTeams(teamIds: string[]) {
    return this.prisma.card.findMany({
      where: {
        teamId: { in: teamIds },
        type: 'PROJECT',
        deletedAt: null,
      },
      orderBy: [{ team: { name: 'asc' } }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        teamId: true,
        estimatedHours: true,
        team: { select: { name: true } },
      },
    });
  }

  findEntriesForTeams(
    teamIds: string[],
    dayStart: Date,
    dayEnd: Date,
    projectId?: string,
  ) {
    const workItemFilter = projectId
      ? {
          OR: [
            { cardId: projectId, card: { deletedAt: null } },
            {
              task: {
                cardId: projectId,
                deletedAt: null,
                card: { deletedAt: null },
              },
            },
          ],
        }
      : {
          OR: [
            { card: { teamId: { in: teamIds }, deletedAt: null } },
            {
              task: {
                deletedAt: null,
                card: { teamId: { in: teamIds }, deletedAt: null },
              },
            },
          ],
        };

    return this.prisma.timeEntry.findMany({
      where: {
        AND: [
          workItemFilter,
          {
            startedAt: { lt: dayEnd },
            OR: [{ endedAt: { gt: dayStart } }, { endedAt: null }],
          },
        ],
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
      },
    });
  }

  findEntriesForProject(projectId: string) {
    return this.prisma.timeEntry.findMany({
      where: {
        OR: [
          { cardId: projectId, card: { deletedAt: null } },
          {
            task: {
              cardId: projectId,
              deletedAt: null,
              card: { deletedAt: null },
            },
          },
        ],
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        user: { select: { name: true } },
      },
    });
  }
}
