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

  async list(options?: {
    search?: string;
    teamId?: string;
  }): Promise<MachineSummary[]> {
    let costCenters: string[] | undefined;

    if (options?.teamId) {
      const links = await this.machineRepository.findCostCenterCodesByTeamId(
        options.teamId,
      );
      costCenters = [
        ...new Set(links.map((link) => link.costCenter.costCenter)),
      ];
    }

    const machines = await this.machineRepository.findMany({
      search: options?.search,
      costCenters,
    });

    return machines.map(toMachineSummary);
  }

  async findById(id: string): Promise<Machine | null> {
    return this.machineRepository.findById(id);
  }
}
