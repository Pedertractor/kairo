import type { PrismaClient, TimeEntry } from '../generated/client.js';
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

  findRecentByUserId(userId: string, take = 50) {
    return this.prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take,
      include: {
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
      },
    });
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
}
