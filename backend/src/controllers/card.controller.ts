import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  activityParamSchema,
  createActivitySchema,
  createProjectSchema,
  projectIdParamSchema,
  projectParamSchema,
  teamIdParamSchema,
  updateActivitySchema,
  updateProjectSchema,
} from '../schemas/card.schema.js';
import { CardService } from '../services/card.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class CardController {
  constructor(private readonly service: CardService) {}

  listActivities = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activities = await this.service.listActivities(
        parsed.data.teamId,
        request.user.sub,
      );

      return sendSuccess(reply, { activities });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = activityParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.getActivity(
        parsed.data.teamId,
        parsed.data.activityId,
        request.user.sub,
      );

      return sendSuccess(reply, { activity });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  createActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = createActivitySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.createActivity(
        params.data.teamId,
        request.user.sub,
        body.data.title,
        body.data.description,
        body.data.estimatedHours,
        body.data.tagId,
        body.data.clientId,
      );

      return sendSuccess(
        reply,
        { activity },
        201,
        MENSAGENS.ATIVIDADE_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = activityParamSchema.safeParse(request.params);
      const body = updateActivitySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.updateActivity(
        params.data.teamId,
        params.data.activityId,
        request.user.sub,
        body.data,
      );

      return sendSuccess(
        reply,
        { activity },
        200,
        MENSAGENS.ATIVIDADE_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listProjects = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const projects = await this.service.listProjects(
        parsed.data.teamId,
        request.user.sub,
      );

      return sendSuccess(reply, { projects });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listAllProjects = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const projects = await this.service.listAllProjects(request.user.sub);

      return sendSuccess(reply, { projects });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getProject = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = projectParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const project = await this.service.getProject(
        parsed.data.teamId,
        parsed.data.projectId,
        request.user.sub,
      );

      return sendSuccess(reply, { project });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getProjectById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = projectIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const project = await this.service.getProjectById(
        parsed.data.projectId,
        request.user.sub,
      );

      return sendSuccess(reply, { project });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  createProject = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = createProjectSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const project = await this.service.createProject(
        params.data.teamId,
        request.user.sub,
        body.data.title,
        body.data.description,
        body.data.estimatedHours,
      );

      return sendSuccess(
        reply,
        { project },
        201,
        MENSAGENS.PROJETO_CRIADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateProject = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = projectParamSchema.safeParse(request.params);
      const body = updateProjectSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const project = await this.service.updateProject(
        params.data.teamId,
        params.data.projectId,
        request.user.sub,
        body.data,
      );

      return sendSuccess(
        reply,
        { project },
        200,
        MENSAGENS.PROJETO_ATUALIZADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  deleteActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = activityParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.deleteActivity(
        parsed.data.teamId,
        parsed.data.activityId,
        request.user.sub,
      );

      return sendSuccess(
        reply,
        { activity },
        200,
        MENSAGENS.ATIVIDADE_REMOVIDA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  deleteProject = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = projectParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const project = await this.service.deleteProject(
        parsed.data.teamId,
        parsed.data.projectId,
        request.user.sub,
      );

      return sendSuccess(
        reply,
        { project },
        200,
        MENSAGENS.PROJETO_REMOVIDO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
