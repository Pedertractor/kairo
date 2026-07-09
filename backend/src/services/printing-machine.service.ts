import type { PrintingMachine } from '../generated/client.js';
import { PrintingMachineRepository } from '../repositories/printing-machine.repository.js';
import type { PrintingMachineSummary } from '../types/printing-machine.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

function toPrintingMachineSummary(
  machine: PrintingMachine,
): PrintingMachineSummary {
  return {
    id: machine.id,
    name: machine.name,
    busy: machine.busy,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString(),
  };
}

export class PrintingMachineService {
  constructor(
    private readonly printingMachineRepository: PrintingMachineRepository,
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
    data: { name?: string; busy?: boolean },
  ): Promise<PrintingMachineSummary> {
    const machine = await this.printingMachineRepository.findById(id);

    if (!machine) {
      throw new AppError(404, MENSAGENS.IMPRESSORA_NAO_ENCONTRADA);
    }

    const updated = await this.printingMachineRepository.update(id, data);
    return toPrintingMachineSummary(updated);
  }

  async delete(id: string): Promise<void> {
    const machine = await this.printingMachineRepository.findById(id);

    if (!machine) {
      throw new AppError(404, MENSAGENS.IMPRESSORA_NAO_ENCONTRADA);
    }

    await this.printingMachineRepository.delete(id);
  }
}
