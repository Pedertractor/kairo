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
      },
    });
  }

  groupCardsByTeamAndType() {
    return this.prisma.card.groupBy({
      by: ['teamId', 'type'],
      where: { deletedAt: null },
      _count: { _all: true },
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

  groupCreatedCardsByType(
    periodStart: Date,
    periodEnd: Date,
    createdById?: string,
  ) {
    return this.prisma.card.groupBy({
      by: ['type'],
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart, lt: periodEnd },
        ...(createdById ? { createdById } : {}),
      },
      _count: { _all: true },
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

  findTimeEntries(periodStart: Date, periodEnd: Date, userId?: string) {
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
        userId: true,
        type: true,
        startedAt: true,
        endedAt: true,
        card: { select: { teamId: true } },
        task: { select: { card: { select: { teamId: true } } } },
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

  findAbsences(periodStart: Date, periodEnd: Date, userId?: string) {
    return this.prisma.userAbsencePeriod.findMany({
      where: {
        ...(userId ? { userId } : { user: { active: true } }),
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
