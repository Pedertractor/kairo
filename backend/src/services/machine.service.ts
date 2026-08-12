import type { Machine } from '../generated/client.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import type { MachineSummary } from '../types/machine.types.js';

function toMachineSummary(machine: Machine): MachineSummary {
  return {
    id: machine.id,
    name: machine.name,
    costCenter: machine.costCenter,
  };
}

export class MachineService {
  constructor(private readonly machineRepository: MachineRepository) {}

  async list(search?: string): Promise<MachineSummary[]> {
    const machines = await this.machineRepository.findMany(search);
    return machines.map(toMachineSummary);
  }

  async findById(id: string): Promise<Machine | null> {
    return this.machineRepository.findById(id);
  }
}
