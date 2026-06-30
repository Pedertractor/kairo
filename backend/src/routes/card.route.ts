import type { FastifyInstance } from 'fastify';
import { CardController } from '../controllers/card.controller.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { CardService } from '../services/card.service.js';

export async function cardRoutes(app: FastifyInstance) {
  const controller = new CardController(
    new CardService(
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
    ),
  );

  app.get(
    '/teams/:teamId/activities',
    { preHandler: [app.authenticate] },
    controller.listActivities,
  );
  app.post(
    '/teams/:teamId/activities',
    { preHandler: [app.authenticate] },
    controller.createActivity,
  );
}
