import type { PrismaClient } from '../generated/client.js';

export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOwnedTeams(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: {
          some: { userId, role: 'ADMIN' },
        },
        active: true,
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

  /**
   * All time entries for the given users in [periodStart, periodEnd), on any
   * team. Used to detect mid-period team ownership switches for availability.
   */
  findEntriesForUsers(
    userIds: string[],
    periodStart: Date,
    periodEnd: Date,
  ) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.timeEntry.findMany({
      where: {
        userId: { in: userIds },
        startedAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: { startedAt: 'asc' },
      select: {
        userId: true,
        startedAt: true,
        card: { select: { teamId: true } },
        task: { select: { card: { select: { teamId: true } } } },
      },
    });
  }

  /**
   * Latest time entry per user before periodStart (carry-over team ownership).
   */
  findLastEntriesBefore(userIds: string[], periodStart: Date) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.timeEntry.findMany({
      where: {
        userId: { in: userIds },
        startedAt: { lt: periodStart },
      },
      distinct: ['userId'],
      orderBy: [{ userId: 'asc' }, { startedAt: 'desc' }],
      select: {
        userId: true,
        startedAt: true,
        card: { select: { teamId: true } },
        task: { select: { card: { select: { teamId: true } } } },
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

  findCardsForStatusOverview(teamIds: string[], employeeId?: string) {
    return this.prisma.card.findMany({
      where: {
        teamId: { in: teamIds },
        deletedAt: null,
        ...(employeeId ? { createdById: employeeId } : {}),
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        tagId: true,
        tag: { select: { name: true, color: true } },
      },
    });
  }

  findTasksForStatusOverview(teamIds: string[], employeeId?: string) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(employeeId ? { createdById: employeeId } : {}),
        card: {
          teamId: { in: teamIds },
          type: 'PROJECT',
          deletedAt: null,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
  }

  findFinishedActivitiesForPeriod(
    teamIds: string[],
    periodStart: Date,
    periodEnd: Date,
    employeeId?: string,
  ) {
    return this.prisma.card.findMany({
      where: {
        teamId: { in: teamIds },
        type: 'ACTIVITY',
        status: 'DONE',
        deletedAt: null,
        updatedAt: { gte: periodStart, lt: periodEnd },
        assignedToId: employeeId ? employeeId : { not: null },
      },
      select: {
        assignedToId: true,
        assignedTo: { select: { id: true, name: true } },
        complexityLevel: true,
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
