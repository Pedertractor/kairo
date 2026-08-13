import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createTaskSchema,
  projectIdParamSchema,
  taskParamSchema,
  updateTaskSchema,
} from '../schemas/task.schema.js';
import { TaskService } from '../services/task.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class TaskController {
  constructor(private readonly service: TaskService) {}

  listTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = projectIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const tasks = await this.service.listTasks(
        parsed.data.projectId,
        request.user.sub,
      );

      return sendSuccess(reply, { tasks });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getTask = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = taskParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const task = await this.service.getTask(
        parsed.data.projectId,
        parsed.data.taskId,
        request.user.sub,
      );

      return sendSuccess(reply, { task });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  createTask = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = projectIdParamSchema.safeParse(request.params);
      const body = createTaskSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const task = await this.service.createTask(
        params.data.projectId,
        request.user.sub,
        body.data.title,
        body.data.description,
        body.data.estimatedHours,
        body.data.machineId,
        body.data.complexityLevel,
      );

      return sendSuccess(
        reply,
        { task },
        201,
        MENSAGENS.TAREFA_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateTask = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = taskParamSchema.safeParse(request.params);
      const body = updateTaskSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const task = await this.service.updateTask(
        params.data.projectId,
        params.data.taskId,
        request.user.sub,
        {
          title: body.data.title,
          status: body.data.status,
          machineId: body.data.machineId,
          complexityLevel: body.data.complexityLevel,
        },
      );

      return sendSuccess(
        reply,
        { task },
        200,
        MENSAGENS.TAREFA_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  deleteTask = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = taskParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const task = await this.service.deleteTask(
        parsed.data.projectId,
        parsed.data.taskId,
        request.user.sub,
      );

      return sendSuccess(
        reply,
        { task },
        200,
        MENSAGENS.TAREFA_REMOVIDA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
