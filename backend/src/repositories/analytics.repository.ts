import type { PrismaClient } from '../generated/client.js';

export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOwnedTeams(userId: string) {
    return this.prisma.team.findMany({
      where: { createdById: userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        members: {
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

  findEntriesForTeams(teamIds: string[], dayStart: Date, dayEnd: Date) {
    return this.prisma.timeEntry.findMany({
      where: {
        AND: [
          {
            OR: [
              { card: { teamId: { in: teamIds } } },
              { task: { card: { teamId: { in: teamIds } } } },
            ],
          },
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
}
