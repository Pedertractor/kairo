import type { PrismaClient } from '../generated/client.js';

export class AdminDashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUsers() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        employeeId: true,
        unit: true,
        role: true,
        active: true,
        absent: true,
        firstLogin: true,
        createdAt: true,
      },
    });
  }

  findTeams() {
    return this.prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        active: true,
        _count: {
          select: { members: true, documents: true },
        },
        cards: {
          where: { deletedAt: null },
          select: { type: true },
        },
      },
    });
  }

  countClients() {
    return this.prisma.client.count();
  }

  groupCardsByTypeAndStatus(createdById?: string) {
    return this.prisma.card.groupBy({
      by: ['type', 'status'],
      where: {
        deletedAt: null,
        ...(createdById ? { createdById } : {}),
      },
      _count: { _all: true },
    });
  }

  groupTasksByStatus(createdById?: string) {
    return this.prisma.task.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ...(createdById ? { createdById } : {}),
      },
      _count: { _all: true },
    });
  }

  countCreatedCards(
    periodStart: Date,
    periodEnd: Date,
    type: 'PROJECT' | 'ACTIVITY',
    createdById?: string,
  ) {
    return this.prisma.card.count({
      where: {
        deletedAt: null,
        type,
        createdAt: { gte: periodStart, lt: periodEnd },
        ...(createdById ? { createdById } : {}),
      },
    });
  }

  countCreatedTasks(periodStart: Date, periodEnd: Date, createdById?: string) {
    return this.prisma.task.count({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart, lt: periodEnd },
        ...(createdById ? { createdById } : {}),
      },
    });
  }

  findTimeEntries(
    periodStart: Date,
    periodEnd: Date,
    userId?: string,
  ) {
    return this.prisma.timeEntry.findMany({
      where: {
        ...(userId ? { userId } : {}),
        startedAt: { lt: periodEnd },
        OR: [{ endedAt: { gt: periodStart } }, { endedAt: null }],
        AND: [
          {
            OR: [
              { card: { deletedAt: null } },
              {
                task: {
                  deletedAt: null,
                  card: { deletedAt: null },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        type: true,
        startedAt: true,
        endedAt: true,
        card: {
          select: {
            title: true,
            type: true,
            teamId: true,
          },
        },
        task: {
          select: {
            title: true,
            card: {
              select: {
                type: true,
                teamId: true,
              },
            },
          },
        },
      },
    });
  }

  findRunningTimers(userId?: string) {
    return this.prisma.timeEntry.findMany({
      where: {
        endedAt: null,
        type: 'TIMER',
        ...(userId ? { userId } : {}),
        OR: [
          { card: { deletedAt: null } },
          {
            task: {
              deletedAt: null,
              card: { deletedAt: null },
            },
          },
        ],
      },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        user: { select: { name: true } },
        card: { select: { title: true, type: true } },
        task: { select: { title: true } },
      },
    });
  }

  findAbsences(
    userIds: string[],
    periodStart: Date,
    periodEnd: Date,
  ) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.userAbsencePeriod.findMany({
      where: {
        userId: { in: userIds },
        startedAt: { lt: periodEnd },
        OR: [{ endedAt: { gt: periodStart } }, { endedAt: null }],
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
      },
    });
  }
}
