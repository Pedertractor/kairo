import type { FastifyInstance } from 'fastify';
import { AbsenceController } from '../controllers/absence.controller.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';

export async function absenceRoutes(app: FastifyInstance) {
  const controller = new AbsenceController(
    new AbsenceService(
      new UserRepository(app.prisma),
      new AbsenceRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new TaskRepository(app.prisma),
      new CardRepository(app.prisma),
    ),
  );
  const auth = { preHandler: [app.authenticate] };

  app.get('/absences', auth, controller.list);
  app.post('/absences', auth, controller.create);
  app.delete('/absences/:id', auth, controller.cancel);
}
