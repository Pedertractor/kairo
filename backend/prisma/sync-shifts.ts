import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client.js';
import { ShiftRepository } from '../src/repositories/shift.repository.js';
import { ShiftService } from '../src/services/shift.service.js';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const service = new ShiftService(new ShiftRepository(prisma));
    const result = await service.syncFromExternal();
    console.log(`synced=${result.synced} updated=${result.updated}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
