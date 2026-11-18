import type { PrismaClient } from '../generated/client.js';
import type { CostCenterSyncItem } from '../utils/cost-center-hierarchy.js';

export class CostCenterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.costCenter.findMany({
      orderBy: { costCenter: 'asc' },
    });
  }

  findByIds(ids: string[]) {
    return this.prisma.costCenter.findMany({
      where: { id: { in: ids } },
    });
  }

  findByTeamId(teamId: string) {
    return this.prisma.teamCostCenter.findMany({
      where: { teamId },
      include: {
        costCenter: {
          select: { id: true, costCenter: true, description: true },
        },
      },
      orderBy: { costCenter: { costCenter: 'asc' } },
    });
  }

  upsertMany(items: CostCenterSyncItem[]) {
    return this.prisma.$transaction(
      items.map(({ costCenter, ...data }) =>
        this.prisma.costCenter.upsert({
          where: { costCenter },
          update: data,
          create: { costCenter, ...data },
        }),
      ),
    );
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

  replaceTeamCostCenters(teamId: string, costCenterIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.teamCostCenter.deleteMany({ where: { teamId } });

      if (costCenterIds.length === 0) {
        return [];
      }

      await tx.teamCostCenter.createMany({
        data: costCenterIds.map((costCenterId) => ({
          teamId,
          costCenterId,
        })),
      });

      return tx.teamCostCenter.findMany({
        where: { teamId },
        include: {
          costCenter: {
            select: { id: true, costCenter: true, description: true },
          },
        },
        orderBy: { costCenter: { costCenter: 'asc' } },
      });
    });
  }
}
