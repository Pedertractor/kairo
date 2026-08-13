import type { Client } from '../generated/client.js';
import { ClientRepository } from '../repositories/client.repository.js';
import type { ClientSummary } from '../types/client.types.js';

function toClientSummary(client: Client): ClientSummary {
  return {
    id: client.id,
    name: client.name,
  };
}

export class ClientService {
  constructor(private readonly clientRepository: ClientRepository) {}

  async list(search?: string): Promise<ClientSummary[]> {
    const clients = await this.clientRepository.findMany(search);
    return clients.map(toClientSummary);
  }

  async findById(id: string): Promise<Client | null> {
    return this.clientRepository.findById(id);
  }
}
