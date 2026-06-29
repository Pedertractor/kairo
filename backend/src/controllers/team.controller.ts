import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createTeamSchema,
  teamIdParamSchema,
  teamMemberParamSchema,
} from '../schemas/team.schema.js';
import { TeamService } from '../services/team.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class TeamController {
  constructor(private readonly service: TeamService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const teams = await this.service.listUserTeams(request.user.sub);
      return sendSuccess(reply, { teams });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.getTeamForMember(
        parsed.data.id,
        request.user.sub,
      );

      return sendSuccess(reply, { team });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  removeMember = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamMemberParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.removeMember(
        parsed.data.id,
        request.user.sub,
        parsed.data.userId,
      );

      return sendSuccess(reply, { team }, 200, MENSAGENS.MEMBRO_REMOVIDO_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = createTeamSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.createTeam(
        request.user.sub,
        parsed.data.name,
        parsed.data.description,
      );

      return sendSuccess(reply, { team }, 201, MENSAGENS.EQUIPE_CRIADA_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
