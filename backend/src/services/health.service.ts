import type { PrismaClient } from '../generated/client.js';
import { HealthRepository } from '../repositories/health.repository.js';
import type { HealthStatus } from '../types/health.types.js';

export class HealthService {
  private readonly repository: HealthRepository;

  constructor(db: PrismaClient) {
    this.repository = new HealthRepository(db);
  }

  async getStatus(): Promise<HealthStatus> {
    return this.repository.getStatus();
  }
}
