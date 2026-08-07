import type { Prisma, PrismaClient, TimeEntry } from '../generated/client.js';
import {
  getEntryDurationSeconds,
  sumEntryDurations,
} from '../utils/time-entry-duration.js';

export class TimeEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActiveByUserId(userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { userId, endedAt: null, type: 'TIMER' },
      orderBy: { startedAt: 'desc' },
      include: {
        card: {
          select: { id: true, title: true, teamId: true, type: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            card: {
              select: {
                id: true,
                title: true,
                teamId: true,
                type: true,
              },
            },
          },
        },
      },
    });
  }

  findActiveByTaskId(taskId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { taskId, endedAt: null, type: 'TIMER' },
      orderBy: { startedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  findActiveManyByTaskId(taskId: string) {
    return this.prisma.timeEntry.findMany({
      where: { taskId, endedAt: null, type: 'TIMER' },
      orderBy: { startedAt: 'desc' },
    });
  }

  countActiveByTaskId(taskId: string) {
    return this.prisma.timeEntry.count({
      where: { taskId, endedAt: null, type: 'TIMER' },
    });
  }

  stopEntry(entry: TimeEntry, endedAt: Date) {
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - entry.startedAt.getTime()) / 1000),
    );

    return this.prisma.timeEntry.update({
      where: { id: entry.id },
      data: { endedAt, durationSeconds },
    });
  }

  startTimer(data: { cardId: string; userId: string; startedAt: Date }) {
    return this.prisma.timeEntry.create({
      data: {
        cardId: data.cardId,
        userId: data.userId,
        type: 'TIMER',
        startedAt: data.startedAt,
      },
    });
  }

  startTaskTimer(data: { taskId: string; userId: string; startedAt: Date }) {
    return this.prisma.timeEntry.create({
      data: {
        taskId: data.taskId,
        userId: data.userId,
        type: 'TIMER',
        startedAt: data.startedAt,
      },
    });
  }

  deleteById(id: string) {
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  findById(id: string) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        task: {
          include: {
            card: {
              select: {
                id: true,
                type: true,
                teamId: true,
              },
            },
          },
        },
      },
    });
  }

  findByIdWithRelations(id: string) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: this.userEntriesInclude,
    });
  }

  private buildTaskEntriesWhere(
    taskId: string,
    date?: string,
  ): Prisma.TimeEntryWhereInput {
    const where: Prisma.TimeEntryWhereInput = { taskId };

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000`);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      where.startedAt = { lt: dayEnd };
      where.OR = [{ endedAt: { gt: dayStart } }, { endedAt: null }];
    }

    return where;
  }

  findByTaskId(
    taskId: string,
    options: { date?: string; skip: number; take: number },
  ) {
    const where = this.buildTaskEntriesWhere(taskId, options.date);

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: options.skip,
      take: options.take,
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  countByTaskId(taskId: string, date?: string) {
    const where = this.buildTaskEntriesWhere(taskId, date);

    return this.prisma.timeEntry.count({ where });
  }

  updateDates(id: string, startedAt: Date, endedAt: Date | null) {
    const durationSeconds = endedAt
      ? Math.max(
          0,
          Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
        )
      : null;

    return this.prisma.timeEntry.update({
      where: { id },
      data: { startedAt, endedAt, durationSeconds },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  private readonly userEntriesInclude = {
    card: {
      select: {
        id: true,
        title: true,
        type: true,
        teamId: true,
        status: true,
        team: { select: { name: true } },
      },
    },
    task: {
      select: {
        id: true,
        title: true,
        status: true,
        card: {
          select: {
            id: true,
            title: true,
            type: true,
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
    },
  } as const;

  findRecentByUserId(userId: string, take = 50) {
    return this.prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take,
      include: this.userEntriesInclude,
    });
  }

  findByUserId(
    userId: string,
    options: { date?: string; skip: number; take: number },
  ) {
    const where = this.buildUserEntriesWhere(userId, options.date);

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: options.skip,
      take: options.take,
      include: this.userEntriesInclude,
    });
  }

  countByUserId(userId: string, date?: string) {
    const where = this.buildUserEntriesWhere(userId, date);

    return this.prisma.timeEntry.count({ where });
  }

  private readonly teamEntriesInclude = {
    user: { select: { id: true, name: true } },
    ...this.userEntriesInclude,
  } as const;

  findByTeamId(
    teamId: string,
    options: { date?: string; skip: number; take: number },
  ) {
    const where = this.buildTeamEntriesWhere(teamId, options.date);

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: options.skip,
      take: options.take,
      include: this.teamEntriesInclude,
    });
  }

  countByTeamId(teamId: string, date?: string) {
    const where = this.buildTeamEntriesWhere(teamId, date);

    return this.prisma.timeEntry.count({ where });
  }

  private buildTeamEntriesWhere(
    teamId: string,
    date?: string,
  ): Prisma.TimeEntryWhereInput {
    const teamFilter: Prisma.TimeEntryWhereInput = {
      OR: [{ card: { teamId } }, { task: { card: { teamId } } }],
    };

    if (!date) {
      return teamFilter;
    }

    const dayStart = new Date(`${date}T00:00:00.000`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return {
      AND: [
        teamFilter,
        {
          startedAt: { lt: dayEnd },
          OR: [{ endedAt: { gt: dayStart } }, { endedAt: null }],
        },
      ],
    };
  }

  private buildUserEntriesWhere(
    userId: string,
    date?: string,
  ): Prisma.TimeEntryWhereInput {
    const where: Prisma.TimeEntryWhereInput = { userId };

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000`);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      where.startedAt = { lt: dayEnd };
      where.OR = [{ endedAt: { gt: dayStart } }, { endedAt: null }];
    }

    return where;
  }

  findOverlappingDay(userId: string, dayStart: Date, dayEnd: Date) {
    return this.prisma.timeEntry.findMany({
      where: {
        userId,
        startedAt: { lt: dayEnd },
        OR: [{ endedAt: { gt: dayStart } }, { endedAt: null }],
      },
      orderBy: { startedAt: 'asc' },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            type: true,
            teamId: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            card: {
              select: {
                id: true,
                title: true,
                type: true,
                teamId: true,
              },
            },
          },
        },
      },
    });
  }

  findOverlappingDayByTeamId(teamId: string, dayStart: Date, dayEnd: Date) {
    return this.prisma.timeEntry.findMany({
      where: {
        AND: [
          { OR: [{ card: { teamId } }, { task: { card: { teamId } } }] },
          {
            startedAt: { lt: dayEnd },
            OR: [{ endedAt: { gt: dayStart } }, { endedAt: null }],
          },
        ],
      },
      orderBy: { startedAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        card: {
          select: {
            id: true,
            title: true,
            type: true,
            teamId: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            card: {
              select: {
                id: true,
                title: true,
                type: true,
                teamId: true,
              },
            },
          },
        },
      },
    });
  }

  async getLoggedSecondsByCardIds(
    cardIds: string[],
  ): Promise<Map<string, number>> {
    if (cardIds.length === 0) {
      return new Map();
    }

    const entries = await this.prisma.timeEntry.findMany({
      where: { cardId: { in: cardIds } },
      select: {
        cardId: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
      },
    });

    const totals = new Map<string, number>();

    for (const entry of entries) {
      if (!entry.cardId) {
        continue;
      }

      const current = totals.get(entry.cardId) ?? 0;
      totals.set(
        entry.cardId,
        current + getEntryDurationSeconds(entry),
      );
    }

    return totals;
  }

  async getLoggedSecondsByProjectIds(
    projectIds: string[],
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const [directEntries, taskEntries] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: { cardId: { in: projectIds } },
        select: {
          cardId: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
        },
      }),
      this.prisma.timeEntry.findMany({
        where: { task: { cardId: { in: projectIds } } },
        select: {
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
          task: { select: { cardId: true } },
        },
      }),
    ]);

    const totals = new Map<string, number>();

    for (const projectId of projectIds) {
      const direct = directEntries.filter(
        (entry) => entry.cardId === projectId,
      );
      const viaTasks = taskEntries.filter(
        (entry) => entry.task?.cardId === projectId,
      );

      totals.set(
        projectId,
        sumEntryDurations([...direct, ...viaTasks]),
      );
    }

    return totals;
  }

  async getLoggedSecondsByTaskId(taskId: string): Promise<number> {
    const entries = await this.prisma.timeEntry.findMany({
      where: { taskId },
      select: {
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
      },
    });

    return sumEntryDurations(entries);
  }
}
