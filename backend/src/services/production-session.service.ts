import type { PrismaClient } from '../generated/client.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

export const PRODUCTION_IDLE_MS = 15_000;

export class ProductionSessionService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string) {
    await this.prisma.productionSession.deleteMany({
      where: { lastActivityAt: { lte: new Date(Date.now() - PRODUCTION_IDLE_MS) } },
    });
    return this.prisma.productionSession.create({ data: { userId } });
  }

  async validate(id: string | undefined, userId: string) {
    if (!id) throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    const session = await this.prisma.productionSession.findFirst({
      where: { id, userId, lastActivityAt: { gt: new Date(Date.now() - PRODUCTION_IDLE_MS) } },
    });
    if (!session) throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    return session;
  }

  async touch(id: string, userId: string) {
    const now = new Date();
    const result = await this.prisma.productionSession.updateMany({
      where: { id, userId, lastActivityAt: { gt: new Date(now.getTime() - PRODUCTION_IDLE_MS) } },
      data: { lastActivityAt: now },
    });
    if (result.count !== 1) throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
    return { expiresAt: new Date(now.getTime() + PRODUCTION_IDLE_MS).toISOString() };
  }

  revoke(id: string, userId: string) {
    return this.prisma.productionSession.deleteMany({ where: { id, userId } });
  }
}
