import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes.js';

export function createApp() {
  const app = express();

  // Libera as origens configuradas (env.corsOrigin) e, por conveniência,
  // qualquer localhost/127.0.0.1 em qualquer porta — assim abrir o app por
  // http://localhost, http://contabilis.local ou :5173 nunca esbarra no CORS.
  const allowList = new Set(env.corsOrigin);
  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          allowList.has(origin) ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
