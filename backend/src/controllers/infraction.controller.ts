import type { FastifyReply, FastifyRequest } from 'fastify';
import { infractionsQuerySchema } from '../schemas/infraction.schema.js';
import { InfractionService } from '../services/infraction.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';
import { InfractionLeaderRepository } from '../repositories/infraction-leader.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { HierarchyRepository } from '../repositories/hierarchy.repository.js';

export class InfractionController {
  constructor(
    private readonly service: InfractionService,
    private readonly leaders: InfractionLeaderRepository,
    private readonly users: UserRepository,
    private readonly hierarchy?: Pick<HierarchyRepository, 'findLeaderUserIdsOfSupervisor'>,
  ) {}

  listLeaders = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return sendSuccess(reply, { leaders: await this.leaders.list() });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getReport = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = infractionsQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(400, 'Informe um mês de 1 a 12 e um ano inteiro positivo');
      }
      const user = await this.users.findById(request.user.sub);
      if (
        !user?.active ||
        (user.role !== 'ADMIN' && user.role !== 'LEADER' && user.role !== 'SUPERVISOR')
      ) {
        throw new AppError(403, 'Acesso proibido');
      }
      if (user.role === 'ADMIN') {
        return sendSuccess(reply, await this.service.getReport(query.data));
      }

      // Membership is resolved for every request, including historical periods.
      // Never use a client-selected leader or return the unrestricted P5 report.
      // A supervisor sees their own teams plus the teams of the leaders below them.
      const leaderIds =
        user.role === 'SUPERVISOR' && this.hierarchy
          ? [user.id, ...(await this.hierarchy.findLeaderUserIdsOfSupervisor({ unit: user.unit, card: user.cardNumber }))]
          : [user.id];
      const members = await this.users.findManagedByTeamAdmins(leaderIds, { active: true });
      const allowed = new Set(members.map(({ unit, cardNumber }) => JSON.stringify([unit, cardNumber])));
      if (allowed.size === 0) {
        return sendSuccess(reply, { ...query.data, people: [], totalPeople: 0, totalInfractions: 0 });
      }
      const report = await this.service.getReport(query.data);
      const people = report.people.filter(({ unit, cardNumber }) => allowed.has(JSON.stringify([unit, cardNumber])));
      return sendSuccess(reply, {
        ...report,
        people,
        totalPeople: people.length,
        totalInfractions: people.reduce((total, person) => total + person.infractionCount, 0),
      });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
