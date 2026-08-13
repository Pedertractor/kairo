import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  addTeamMemberSchema,
  createTeamSchema,
  teamIdParamSchema,
  teamMemberParamSchema,
  updateMemberAbsentSchema,
  updateTeamSchema,
} from '../schemas/team.schema.js';
import { setTeamCostCentersSchema } from '../schemas/cost-center.schema.js';
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

  promoteAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamMemberParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.promoteAdmin(
        parsed.data.id,
        request.user.sub,
        parsed.data.userId,
      );

      return sendSuccess(
        reply,
        { team },
        200,
        MENSAGENS.ADMIN_PROMOVIDO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  demoteAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamMemberParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.demoteAdmin(
        parsed.data.id,
        request.user.sub,
        parsed.data.userId,
      );

      return sendSuccess(
        reply,
        { team },
        200,
        MENSAGENS.ADMIN_REBAIXADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateMemberAbsent = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const params = teamMemberParamSchema.safeParse(request.params);
      const body = updateMemberAbsentSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.updateMemberAbsent(
        params.data.id,
        request.user.sub,
        params.data.userId,
        body.data.absent,
      );

      return sendSuccess(
        reply,
        { team },
        200,
        MENSAGENS.AUSENCIA_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  addMember = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = addTeamMemberSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.addMember(
        params.data.id,
        request.user.sub,
        body.data.userId,
      );

      return sendSuccess(reply, { team }, 201, MENSAGENS.MEMBRO_ADICIONADO_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listAvailableMembers = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const users = await this.service.listAvailableMembers(
        parsed.data.id,
        request.user.sub,
      );

      return sendSuccess(reply, { users });
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

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = updateTeamSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.updateTeam(
        params.data.id,
        request.user.sub,
        body.data,
      );

      return sendSuccess(
        reply,
        { team },
        200,
        MENSAGENS.EQUIPE_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listCostCenters = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const costCenters = await this.service.listTeamCostCenters(
        parsed.data.id,
        request.user.sub,
      );

      return sendSuccess(reply, { costCenters });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  setCostCenters = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = setTeamCostCentersSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const team = await this.service.setTeamCostCenters(
        params.data.id,
        request.user.sub,
        body.data.costCenterIds,
      );

      return sendSuccess(
        reply,
        { team },
        200,
        MENSAGENS.CENTROS_CUSTO_ATUALIZADOS_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
