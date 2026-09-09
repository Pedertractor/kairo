import type {
  PrismaClient,
  ShiftSource,
} from '../generated/client.js';

export type ShiftPeriodRecord = {
  id: string;
  userId: string;
  startMinutes: number;
  endMinutes: number;
  startedAt: Date;
  endedAt: Date | null;
  source: ShiftSource;
};

export class ShiftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findCurrentByUserId(userId: string) {
    return this.prisma.userShiftPeriod.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  findCurrentByUserIds(userIds: string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([] as ShiftPeriodRecord[]);
    }

    return this.prisma.userShiftPeriod.findMany({
      where: {
        userId: { in: userIds },
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  findOverlappingRange(userIds: string[], rangeStart: Date, rangeEnd: Date) {
    if (userIds.length === 0) {
      return Promise.resolve([] as ShiftPeriodRecord[]);
    }

    return this.prisma.userShiftPeriod.findMany({
      where: {
        userId: { in: userIds },
        startedAt: { lt: rangeEnd },
        OR: [{ endedAt: null }, { endedAt: { gt: rangeStart } }],
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  findAllUsersWithCurrentShift() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        unit: true,
        cardNumber: true,
        shiftPeriods: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async replaceCurrentPeriod(data: {
    userId: string;
    startMinutes: number;
    endMinutes: number;
    source: ShiftSource;
    at?: Date;
  }) {
    const at = data.at ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.userShiftPeriod.findFirst({
        where: { userId: data.userId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });

      if (
        current &&
        current.startMinutes === data.startMinutes &&
        current.endMinutes === data.endMinutes
      ) {
        return { changed: false as const, period: current };
      }

      if (current) {
        await tx.userShiftPeriod.update({
          where: { id: current.id },
          data: { endedAt: at },
        });
      }

      const period = await tx.userShiftPeriod.create({
        data: {
          userId: data.userId,
          startMinutes: data.startMinutes,
          endMinutes: data.endMinutes,
          startedAt: at,
          source: data.source,
        },
      });

      return { changed: true as const, period };
    });
  }

  getJob(name: string) {
    return this.prisma.appJob.findUnique({ where: { name } });
  }

  upsertJob(name: string, lastRunAt: Date) {
    return this.prisma.appJob.upsert({
      where: { name },
      create: { name, lastRunAt },
      update: { lastRunAt },
    });
  }
}
