import type { PrismaClient } from '../generated/client.js';

export class ClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(search?: string) {
    const q = search?.trim();

    return this.prisma.client.findMany({
      where: q
        ? {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }
}
