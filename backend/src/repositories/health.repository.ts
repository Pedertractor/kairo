import type { PrismaClient } from '../generated/client.js';
import type { HealthStatus } from '../types/health.types.js';

export class HealthRepository {
  constructor(private readonly db: PrismaClient) {}

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<HealthStatus> {
    const isConnected = await this.checkDatabaseConnection();

    return {
      status: isConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
    };
  }
}
