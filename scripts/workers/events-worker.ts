import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { EventsService } from '../../src/events/events.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  const config = app.get(ConfigService);
  const events = app.get(EventsService);
  const once = process.argv.includes('--once');
  const limit = Number(process.env.WORKER_EVENTS_BATCH_SIZE ?? config.get<number>('WORKER_EVENTS_BATCH_SIZE', 25));
  const intervalMs = Number(process.env.WORKER_EVENTS_INTERVAL_MS ?? config.get<number>('WORKER_EVENTS_INTERVAL_MS', 5000));
  const workerName = process.env.WORKER_NAME ?? 'event-outbox-worker';
  let closing = false;

  async function runOne() {
    const result = await events.runWorkerBatch({ workerName, limit });
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...result }));
  }

  async function shutdown(signal: string) {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, closing event worker`);
    await app.close();
    process.exit(0);
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  if (once) {
    await runOne();
    await app.close();
    return;
  }

  console.log(`Event worker started: workerName=${workerName} intervalMs=${intervalMs} limit=${limit}`);
  while (!closing) {
    try {
      await runOne();
    } catch (error) {
      console.error(error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
