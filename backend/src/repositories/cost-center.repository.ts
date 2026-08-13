import type { PrismaClient } from '../generated/client.js';

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

  upsertMany(
    items: Array<{ costCenter: string; description: string }>,
  ) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.costCenter.upsert({
          where: { costCenter: item.costCenter },
          update: { description: item.description },
          create: {
            costCenter: item.costCenter,
            description: item.description,
          },
        }),
      ),
    );
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
