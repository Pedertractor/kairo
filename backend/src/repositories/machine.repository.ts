import type { PrismaClient } from '../generated/client.js';

export class MachineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(options?: { search?: string; costCenters?: string[] }) {
    const q = options?.search?.trim();
    const costCenters = options?.costCenters;

    if (costCenters !== undefined && costCenters.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.machine.findMany({
      where: {
        ...(costCenters
          ? {
              costCenter: {
                in: costCenters,
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                {
                  name: {
                    contains: q,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  costCenter: {
                    contains: q,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.machine.findUnique({
      where: { id },
    });
  }

  findCostCenterCodesByTeamId(teamId: string) {
    return this.prisma.teamCostCenter.findMany({
      where: { teamId },
      select: {
        costCenter: {
          select: { costCenter: true },
        },
      },
    });
  }
}
