import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  activityParamSchema,
  createActivitySchema,
  createProjectSchema,
  projectParamSchema,
  teamIdParamSchema,
} from '../schemas/card.schema.js';
import { AuthService } from '../services/auth.service.js';
import { CardService } from '../services/card.service.js';
import { TagService } from '../services/tag.service.js';
import { TeamService } from '../services/team.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class IntegrationController {
  constructor(
    private readonly authService: AuthService,
    private readonly teamService: TeamService,
    private readonly tagService: TagService,
    private readonly cardService: CardService,
  ) {}

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await this.authService.getAuthenticatedUser(request.user.sub);
      return sendSuccess(reply, { user });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listTeams = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const teams = await this.teamService.listUserTeams(request.user.sub, true);
      return sendSuccess(reply, { teams });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listTags = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const tags = await this.tagService.list(
        parsed.data.teamId,
        request.user.sub,
      );

      return sendSuccess(reply, { tags });
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

      const activity = await this.cardService.getActivity(
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

      const activity = await this.cardService.createActivity(
        params.data.teamId,
        request.user.sub,
        body.data.title,
        body.data.description,
        body.data.estimatedHours,
        body.data.tagId,
        body.data.clientId,
        body.data.machineId,
        body.data.complexityLevel,
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

  getProject = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = projectParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const project = await this.cardService.getProject(
        parsed.data.teamId,
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

      const project = await this.cardService.createProject(
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
}
