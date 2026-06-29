import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
