import type { PrismaClient, UserRole } from '../generated/client.js';

const NON_LEADER_ROLES: UserRole[] = ['ADMIN', 'USER'];

export class OccupationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActiveNonLeaderMembers() {
    return this.prisma.user.findMany({
      where: {
        active: true,
        role: { in: NON_LEADER_ROLES },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        cardNumber: true,
        unit: true,
        role: true,
      },
    });
  }

  findTimeEntries(
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
        startedAt: true,
        endedAt: true,
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
