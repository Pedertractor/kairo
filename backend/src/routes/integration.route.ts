import type { FastifyInstance } from 'fastify';
import { IntegrationController } from '../controllers/integration.controller.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { ClientRepository } from '../repositories/client.repository.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';
import { AuthService } from '../services/auth.service.js';
import { CardService } from '../services/card.service.js';
import { TagService } from '../services/tag.service.js';
import { TeamService } from '../services/team.service.js';

export async function integrationRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const absenceRepository = new AbsenceRepository(app.prisma);
  const absenceService = new AbsenceService(
    userRepository,
    absenceRepository,
    new TimeEntryRepository(app.prisma),
    new TaskRepository(app.prisma),
    new CardRepository(app.prisma),
  );

  const controller = new IntegrationController(
    new AuthService(
      userRepository,
      new RefreshTokenRepository(app.prisma),
      absenceService,
    ),
    new TeamService(
      new TeamRepository(app.prisma),
      userRepository,
      absenceService,
      absenceRepository,
      new CostCenterRepository(app.prisma),
    ),
    new TagService(
      new TagRepository(app.prisma),
      new TeamRepository(app.prisma),
    ),
    new CardService(
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new FavoriteRepository(app.prisma),
      new TagRepository(app.prisma),
      new ClientRepository(app.prisma),
      new MachineRepository(app.prisma),
      userRepository,
    ),
  );

  const auth = { preHandler: [app.authenticateApiKey] };

  app.get('/integrations/v1/me', auth, controller.me);
  app.get('/integrations/v1/teams', auth, controller.listTeams);
  app.get(
    '/integrations/v1/teams/:teamId/tags',
    auth,
    controller.listTags,
  );
  app.get(
    '/integrations/v1/teams/:teamId/activities/:activityId',
    auth,
    controller.getActivity,
  );
  app.post(
    '/integrations/v1/teams/:teamId/activities',
    auth,
    controller.createActivity,
  );
  app.delete(
    '/integrations/v1/teams/:teamId/activities/:activityId',
    auth,
    controller.deleteActivity,
  );
  app.get(
    '/integrations/v1/teams/:teamId/projects/:projectId',
    auth,
    controller.getProject,
  );
  app.post(
    '/integrations/v1/teams/:teamId/projects',
    auth,
    controller.createProject,
  );
  app.delete(
    '/integrations/v1/teams/:teamId/projects/:projectId',
    auth,
    controller.deleteProject,
  );
}
