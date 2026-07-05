import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientesRouter } from './modules/clientes/clientes.routes.js';
import { cctRouter } from './modules/cct/cct.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { ocorrenciasRouter } from './modules/ocorrencias/ocorrencias.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/clientes', clientesRouter);
apiRouter.use('/cct', cctRouter);
apiRouter.use('/alteracoes', auditRouter);
apiRouter.use('/ocorrencias', ocorrenciasRouter);
