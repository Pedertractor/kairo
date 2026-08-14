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
          where: { role: 'MEMBER' },
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

  findActivityEntriesForTeams(
    teamIds: string[],
    dayStart: Date,
    dayEnd: Date,
    employeeId?: string,
  ) {
    return this.prisma.timeEntry.findMany({
      where: {
        ...(employeeId ? { userId: employeeId } : {}),
        card: {
          teamId: { in: teamIds },
          type: 'ACTIVITY',
          deletedAt: null,
        },
        startedAt: { lt: dayEnd },
        OR: [{ endedAt: { gt: dayStart } }, { endedAt: null }],
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
        cardId: true,
        card: {
          select: {
            tagId: true,
            tag: { select: { name: true, color: true } },
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  findActivitiesForClientAnalytics(
    teamIds: string[],
    periodStart: Date,
    periodEnd: Date,
    employeeId?: string,
  ) {
    return this.prisma.card.findMany({
      where: {
        teamId: { in: teamIds },
        type: 'ACTIVITY',
        deletedAt: null,
        createdAt: { gte: periodStart, lt: periodEnd },
        ...(employeeId ? { createdById: employeeId } : {}),
      },
      select: {
        id: true,
        clientId: true,
        client: { select: { id: true, name: true } },
      },
    });
  }

  findTasksForClientAnalytics(
    teamIds: string[],
    periodStart: Date,
    periodEnd: Date,
    employeeId?: string,
  ) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart, lt: periodEnd },
        ...(employeeId ? { createdById: employeeId } : {}),
        card: {
          teamId: { in: teamIds },
          type: 'PROJECT',
          deletedAt: null,
        },
      },
      select: {
        id: true,
        card: {
          select: {
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });
  }
}
