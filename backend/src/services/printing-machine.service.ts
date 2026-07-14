import type { PrintingMachine } from '../generated/client.js';
import { PrintingMachineRepository } from '../repositories/printing-machine.repository.js';
import { ThreeDPartRepository } from '../repositories/three-d-part.repository.js';
import type { PrintingMachineSummary } from '../types/printing-machine.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

type PrintingMachineWithPart = PrintingMachine & {
  threeDPart: {
    id: string;
    name: string;
    code: string;
    timeToPrint: number;
  } | null;
};

function toPrintingMachineSummary(
  machine: PrintingMachineWithPart,
): PrintingMachineSummary {
  return {
    id: machine.id,
    name: machine.name,
    busy: machine.busy,
    paused: machine.paused,
    part: machine.threeDPart,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString(),
  };
}

export class PrintingMachineService {
  constructor(
    private readonly printingMachineRepository: PrintingMachineRepository,
    private readonly threeDPartRepository: ThreeDPartRepository,
  ) {}

  async list(): Promise<PrintingMachineSummary[]> {
    const machines = await this.printingMachineRepository.findAll();
    return machines.map(toPrintingMachineSummary);
  }

  async getById(id: string): Promise<PrintingMachineSummary> {
    const machine = await this.printingMachineRepository.findById(id);

    if (!machine) {
      throw new AppError(404, MENSAGENS.IMPRESSORA_NAO_ENCONTRADA);
    }

    return toPrintingMachineSummary(machine);
  }

  async create(
    name: string,
    busy = false,
  ): Promise<PrintingMachineSummary> {
    const machine = await this.printingMachineRepository.create({ name, busy });
    return toPrintingMachineSummary(machine);
  }

  async update(
    id: string,
    data: {
      name?: string;
      busy?: boolean;
      paused?: boolean;
      threeDPartId?: string | null;
    },
  ): Promise<{ machine: PrintingMachineSummary; mensagem: string }> {
    const machine = await this.printingMachineRepository.findById(id);

    if (!machine) {
      throw new AppError(404, MENSAGENS.IMPRESSORA_NAO_ENCONTRADA);
    }

    const updateData = { ...data };
    let mensagem: string = MENSAGENS.IMPRESSORA_ATUALIZADA_SUCESSO;

    if (updateData.threeDPartId) {
      await this.assertValidPart(updateData.threeDPartId);
    }

    if (updateData.busy === true && machine.busy) {
      throw new AppError(400, MENSAGENS.IMPRESSORA_JA_OCUPADA);
    }

    if (
      updateData.busy === true &&
      !updateData.threeDPartId &&
      !machine.threeDPartId
    ) {
      throw new AppError(400, MENSAGENS.PECA_OBRIGATORIA_PARA_IMPRESSAO);
    }

    if (
      updateData.busy === true &&
      !updateData.threeDPartId &&
      machine.threeDPartId
    ) {
      updateData.threeDPartId = machine.threeDPartId;
    }

    if (updateData.busy === true) {
      updateData.paused = false;
    }

    if (updateData.busy === false) {
      updateData.threeDPartId = null;
      updateData.paused = false;
      mensagem = MENSAGENS.IMPRESSAO_CONCLUIDA_SUCESSO;
    }

    if (updateData.paused === true) {
      if (!machine.busy && updateData.busy !== true) {
        throw new AppError(400, MENSAGENS.IMPRESSORA_NAO_ESTA_OCUPADA);
      }

      if (machine.paused) {
        throw new AppError(400, MENSAGENS.IMPRESSORA_JA_PAUSADA);
      }

      mensagem = MENSAGENS.IMPRESSAO_PAUSADA_SUCESSO;
    }

    if (updateData.paused === false && updateData.busy === undefined) {
      if (!machine.busy) {
        throw new AppError(400, MENSAGENS.IMPRESSORA_NAO_ESTA_OCUPADA);
      }

      if (!machine.paused) {
        throw new AppError(400, MENSAGENS.IMPRESSORA_NAO_ESTA_PAUSADA);
      }

      mensagem = MENSAGENS.IMPRESSAO_RETOMADA_SUCESSO;
    }

    const updated = await this.printingMachineRepository.update(id, updateData);

    return {
      machine: toPrintingMachineSummary(updated),
      mensagem,
    };
  }

  async delete(id: string): Promise<void> {
    const machine = await this.printingMachineRepository.findById(id);

    if (!machine) {
      throw new AppError(404, MENSAGENS.IMPRESSORA_NAO_ENCONTRADA);
    }

    await this.printingMachineRepository.delete(id);
  }

  private async assertValidPart(threeDPartId: string) {
    const part = await this.threeDPartRepository.findById(threeDPartId);

    if (!part) {
      throw new AppError(404, MENSAGENS.PECA_3D_NAO_ENCONTRADA);
    }
  }
}
