import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientesRouter } from './modules/clientes/clientes.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { ocorrenciasRouter } from './modules/ocorrencias/ocorrencias.routes.js';
import { pendenciasRouter } from './modules/pendencias/pendencias.routes.js';
import { eventosRouter } from './modules/eventos/eventos.routes.js';
import { relatoriosRouter } from './modules/relatorios/relatorios.routes.js';
import { senhasSetorRouter } from './modules/senhas-setor/senhas-setor.routes.js';
import { entidadesRouter } from './modules/entidades/entidades.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/clientes', clientesRouter);
apiRouter.use('/alteracoes', auditRouter);
apiRouter.use('/ocorrencias', ocorrenciasRouter);
apiRouter.use('/pendencias', pendenciasRouter);
apiRouter.use('/eventos-futuros', eventosRouter);
apiRouter.use('/relatorios', relatoriosRouter);
apiRouter.use('/senhas-setor', senhasSetorRouter);
apiRouter.use('/entidades', entidadesRouter);
