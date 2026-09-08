import type { PrismaClient } from '../generated/client.js';

function coveringOnWhere(on: Date) {
  return {
    startedAt: { lte: on },
    OR: [{ endedAt: null }, { endedAt: { gt: on } }],
  };
}

export class AbsenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOpenByUserId(userId: string) {
    return this.prisma.userAbsencePeriod.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  findCoveringOn(userId: string, on = new Date()) {
    return this.prisma.userAbsencePeriod.findFirst({
      where: { userId, ...coveringOnWhere(on) },
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
            OR: [{ endedAt: null }, { endedAt: { gt: startedAt } }],
          },
          ...(endedAt === null
            ? []
            : [{ startedAt: { lt: endedAt } }]),
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
        OR: [{ endedAt: null }, { endedAt: { gt: rangeStart } }],
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

    const on = new Date();

    return this.prisma.userAbsencePeriod.findMany({
      where: {
        userId: { in: userIds },
        ...coveringOnWhere(on),
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}
