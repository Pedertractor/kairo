import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createPrintingMachineSchema,
  printingMachineIdParamSchema,
  updatePrintingMachineSchema,
} from '../schemas/printing-machine.schema.js';
import { PrintingMachineService } from '../services/printing-machine.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class PrintingMachineController {
  constructor(private readonly service: PrintingMachineService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const printingMachines = await this.service.list();
      return sendSuccess(reply, { printingMachines });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = printingMachineIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const printingMachine = await this.service.getById(parsed.data.id);
      return sendSuccess(reply, { printingMachine });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = createPrintingMachineSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const printingMachine = await this.service.create(
        parsed.data.name,
        parsed.data.busy,
      );

      return sendSuccess(
        reply,
        { printingMachine },
        201,
        MENSAGENS.IMPRESSORA_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = printingMachineIdParamSchema.safeParse(request.params);
      const body = updatePrintingMachineSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const printingMachine = await this.service.update(
        params.data.id,
        body.data,
      );

      return sendSuccess(
        reply,
        { printingMachine },
        200,
        MENSAGENS.IMPRESSORA_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = printingMachineIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.delete(parsed.data.id);

      return sendSuccess(reply, null, 200, MENSAGENS.IMPRESSORA_REMOVIDA_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
