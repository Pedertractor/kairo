import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client.js';
import { externalApi, ExternalApiError } from '../src/lib/external-api.js';
import { CostCenterRepository } from '../src/repositories/cost-center.repository.js';
import { CostCenterService } from '../src/services/cost-center.service.js';

async function inspectExternal() {
  try {
    const body = await externalApi.get<unknown>('/cost-center/list');

    if (Array.isArray(body)) {
      console.log(`external: array count=${body.length}`);
      const row = body[0];
      if (row && typeof row === 'object') {
        const record = row as Record<string, unknown>;
        console.log(`sampleKeys=${Object.keys(record).join(',')}`);
        console.log(
          `STATUS=${String(record.STATUS)} typeof=${typeof record.STATUS}`,
        );
        console.log(
          `CCUSTO=${String(record.CCUSTO)} typeof=${typeof record.CCUSTO}`,
        );
      }
      return;
    }

    if (body == null) {
      console.log('external: empty body');
      return;
    }

    console.log(`external: type=${typeof body}`);
    if (typeof body === 'object') {
      console.log(`keys=${Object.keys(body as object).join(',')}`);
    }
  } catch (error) {
    if (error instanceof ExternalApiError) {
      console.log(
        `external_error status=${error.status} message=${error.message}`,
      );
      return;
    }

    throw error;
  }
}

async function main() {
  await inspectExternal();

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const service = new CostCenterService(new CostCenterRepository(prisma));
    const result = await service.syncFromExternal();
    console.log(`synced=${result.synced} total=${result.costCenters.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
