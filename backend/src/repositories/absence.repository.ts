import type { PrismaClient } from '../generated/client.js';

function coveringOnWhere(on: Date) {
  return {
    startedAt: { lte: on },
    OR: [{ endedAt: null }, { endedAt: { gt: on } }],
  };
}

export class AbsenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findVisible(userIds: string[]) {
    return this.prisma.userAbsencePeriod.findMany({
      where: {
        userId: { in: userIds },
      },
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findAllFiltered(filters: {
    userId?: string;
    createdById?: string;
    status?: 'scheduled' | 'ongoing' | 'finished';
    from?: Date;
    to?: Date;
    now?: Date;
  }) {
    const now = filters.now ?? new Date();
    const and: Array<Record<string, unknown>> = [];

    if (filters.userId) {
      and.push({ userId: filters.userId });
    }

    if (filters.createdById) {
      and.push({ createdById: filters.createdById });
    }

    if (filters.from || filters.to) {
      const overlap: Array<Record<string, unknown>> = [];

      if (filters.to) {
        overlap.push({ startedAt: { lt: filters.to } });
      }

      if (filters.from) {
        overlap.push({
          OR: [{ endedAt: null }, { endedAt: { gt: filters.from } }],
        });
      }

      and.push({ AND: overlap });
    }

    if (filters.status === 'scheduled') {
      and.push({ startedAt: { gt: now } });
    } else if (filters.status === 'ongoing') {
      and.push({
        startedAt: { lte: now },
        OR: [{ endedAt: null }, { endedAt: { gt: now } }],
      });
    } else if (filters.status === 'finished') {
      and.push({
        endedAt: { not: null, lte: now },
      });
    }

    return this.prisma.userAbsencePeriod.findMany({
      where: and.length > 0 ? { AND: and } : undefined,
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  countCreatedByOthersSince(
    userIds: string[],
    excludeCreatedById: string,
    since: Date | null,
  ) {
    if (userIds.length === 0) {
      return Promise.resolve(0);
    }

    return this.prisma.userAbsencePeriod.count({
      where: {
        userId: { in: userIds },
        createdById: { not: excludeCreatedById },
        ...(since ? { createdAt: { gt: since } } : {}),
      },
    });
  }

  findById(id: string) {
    return this.prisma.userAbsencePeriod.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

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
    excludeId?: string,
  ) {
    return this.prisma.userAbsencePeriod.findFirst({
      where: {
        userId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
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

  update(
    id: string,
    data: {
      userId: string;
      startedAt: Date;
      endedAt: Date | null;
    },
  ) {
    return this.prisma.userAbsencePeriod.update({
      where: { id },
      data,
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
        id: true,
        userId: true,
        startedAt: true,
        endedAt: true,
        user: { select: { name: true } },
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

  delete(id: string) {
    return this.prisma.userAbsencePeriod.delete({ where: { id } });
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
