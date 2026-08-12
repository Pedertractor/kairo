import type { PrismaClient } from '../generated/client.js';

export class MachineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(search?: string) {
    const q = search?.trim();

    return this.prisma.machine.findMany({
      where: q
        ? {
            OR: [
              {
                name: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                costCenter: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.machine.findUnique({
      where: { id },
    });
  }
}
