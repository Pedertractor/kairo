import type { PrismaClient } from '../generated/client.js';

export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActiveByHash(keyHash: string) {
    return this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        user: { active: true },
      },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.apiKey.findFirst({
      where: { id, userId },
    });
  }

  listByUserId(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
  }) {
    return this.prisma.apiKey.create({ data });
  }

  revoke(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  touchLastUsed(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
