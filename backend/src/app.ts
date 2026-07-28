import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes.js';

/** localhost/127.0.0.1 em qualquer porta, e o alias local do app. */
const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|contabilis\.local)(:\d+)?$/;

export function createApp() {
  const app = express();

  // Atrás do proxy do Vercel: faz req.ip refletir o X-Forwarded-For, do que
  // depende o rate limit do login.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Cabeçalhos de segurança. A API só devolve JSON, então a CSP de documento
  // do helmet não se aplica — o que importa é nosniff, sem enquadramento em
  // iframe, referrer restrito e HSTS.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  /**
   * CORS. Em produção o frontend é servido pelo mesmo domínio do Vercel, então
   * as requisições chegam sem header `Origin` e não precisam de liberação.
   * Origens externas só passam se estiverem em CORS_ORIGIN. Em desenvolvimento
   * qualquer localhost é liberado por conveniência.
   */
  const allowList = new Set(env.corsOrigin);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowList.has(origin)) return callback(null, true);
        if (!env.isProd && ORIGEM_LOCAL.test(origin)) return callback(null, true);
        return callback(null, false);
      },
      maxAge: 86400,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
