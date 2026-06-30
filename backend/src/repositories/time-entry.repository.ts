import type { PrismaClient, TimeEntry } from '../generated/client.js';

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
}
