import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/index.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API Contabilis ouvindo em http://localhost:${env.port}/api`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} recebido — encerrando...`);
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
