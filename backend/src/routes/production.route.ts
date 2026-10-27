import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRepository } from '../repositories/user.repository.js';
import { ProductionSessionService, PRODUCTION_IDLE_MS } from '../services/production-session.service.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';
import { toSafeUser } from '../utils/user.js';

const loginSchema = z.object({
  cardNumber: z.string().trim().min(1).max(50),
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
}).strict();

export async function productionRoutes(app: FastifyInstance) {
  const sessions = new ProductionSessionService(app.prisma);
  const users = new UserRepository(app.prisma);
  // Bounded per-IP login attempts; Fastify does not trust forwarded IPs by default.
  const attempts = new Map<string, { count: number; until: number }>();
  app.post('/production/login', {
    preHandler: async (request, reply) => {
      const now = Date.now();
      for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
      const entry = attempts.get(request.ip) ?? { count: 0, until: now + 60_000 };
      if (entry.count >= 20 || (!attempts.has(request.ip) && attempts.size >= 10_000)) {
        reply.header('Retry-After', Math.max(1, Math.ceil((entry.until - now) / 1000)));
        throw new AppError(429, 'Muitas tentativas. Aguarde um minuto.');
      }
      entry.count++;
      attempts.set(request.ip, entry);
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    const user = await users.findByUnitAndCardNumber(parsed.data.unit, parsed.data.cardNumber);
    if (!user?.active || !user.production || user.role !== 'USER') {
      throw new AppError(401, MENSAGENS.CREDENCIAIS_INVALIDAS);
    }
    const session = await sessions.create(user.id);
    const token = await reply.jwtSign({ sub: user.id, productionSessionId: session.id }, { expiresIn: '8h' });
    reply.header('Cache-Control', 'no-store');
    return sendSuccess(reply, {
      token,
      user: { ...toSafeUser(user), firstLogin: false },
      expiresAt: new Date(session.lastActivityAt.getTime() + PRODUCTION_IDLE_MS).toISOString(),
    });
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    return payload;
  });

  const requireProduction: typeof app.authenticate = async (request, reply) => {
    await app.authenticate(request, reply);
    if (!request.user.productionSessionId) throw new AppError(403, MENSAGENS.PROIBIDO);
  };

  app.post('/production/session/activity', { preHandler: [requireProduction] }, async (request, reply) => {
    return sendSuccess(reply, await sessions.touch(request.user.productionSessionId!, request.user.sub));
  });

  app.get('/production/activities', { preHandler: [requireProduction] }, async (request, reply) => {
    const activities = await app.prisma.card.findMany({
      where: {
        type: 'ACTIVITY',
        deletedAt: null,
        team: { active: true, members: { some: { userId: request.user.sub } } },
      },
      select: { id: true, title: true, teamId: true, status: true, team: { select: { name: true } } },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
    const recentEntries = activities.length === 0 ? [] : await app.prisma.timeEntry.groupBy({
      by: ['cardId'],
      where: { userId: request.user.sub, cardId: { in: activities.map((activity) => activity.id) } },
      _max: { startedAt: true },
    });
    const lastWorkedAt = new Map(recentEntries.map((entry) => [entry.cardId, entry._max.startedAt]));
    return sendSuccess(reply, {
      activities: activities.map((activity) => ({
        ...activity,
        lastWorkedAt: lastWorkedAt.get(activity.id)?.toISOString() ?? null,
      })),
    });
  });
}
