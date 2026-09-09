import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { ShiftRepository } from './repositories/shift.repository.js';
import { ShiftService } from './services/shift.service.js';

const SHIFT_SYNC_CHECK_INTERVAL_MS = 60 * 60 * 1000;

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`Server running at http://${env.HOST}:${env.PORT}`);

    const shiftService = new ShiftService(new ShiftRepository(app.prisma));

    const runShiftSyncCheck = async () => {
      try {
        const result = await shiftService.runScheduledSyncIfDue();

        if (result.ran) {
          app.log.info(
            { synced: result.synced, updated: result.updated },
            'Shift sync completed',
          );
        }
      } catch (error) {
        app.log.error(error, 'Shift sync failed');
      }
    };

    void runShiftSyncCheck();
    setInterval(() => {
      void runShiftSyncCheck();
    }, SHIFT_SYNC_CHECK_INTERVAL_MS);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
