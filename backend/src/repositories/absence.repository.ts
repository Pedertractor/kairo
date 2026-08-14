import type { PrismaClient } from '../generated/client.js';

export class AbsenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOpenByUserId(userId: string) {
    return this.prisma.userAbsencePeriod.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  findOverlapping(
    userId: string,
    startedAt: Date,
    endedAt: Date | null,
  ) {
    return this.prisma.userAbsencePeriod.findFirst({
      where: {
        userId,
        AND: [
          {
            OR: [{ endedAt: null }, { endedAt: { gte: startedAt } }],
          },
          ...(endedAt === null
            ? []
            : [{ startedAt: { lte: endedAt } }]),
        ],
      },
    });
  }

  findOverlappingRange(
    userIds: string[],
    rangeStart: Date,
    rangeEndExclusive: Date,
  ) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.userAbsencePeriod.findMany({
      where: {
        userId: { in: userIds },
        startedAt: { lt: rangeEndExclusive },
        OR: [{ endedAt: null }, { endedAt: { gte: rangeStart } }],
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
      },
    });
  }

  create(data: {
    userId: string;
    startedAt: Date;
    endedAt: Date | null;
    createdById: string;
  }) {
    return this.prisma.userAbsencePeriod.create({ data });
  }

  close(id: string, endedAt: Date) {
    return this.prisma.userAbsencePeriod.update({
      where: { id },
      data: { endedAt },
    });
  }

  findCurrentStartedAtByUserIds(userIds: string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.userAbsencePeriod.findMany({
      where: {
        userId: { in: userIds },
        endedAt: null,
      },
      select: {
        userId: true,
        startedAt: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}
