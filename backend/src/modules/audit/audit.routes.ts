import { Router } from 'express';
import { asyncHandler } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { listAlteracoes, type Entidade } from './audit.repository.js';

export const auditRouter = Router();
auditRouter.use(requireAuth);

// Lista a trilha de auditoria com filtros opcionais (?entidade=&q=&entidade_id=&limit=)
auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { entidade, q, entidade_id, limit } = req.query;
    res.json(
      await listAlteracoes({
        entidade:
          entidade === 'cliente' || entidade === 'convencao' ? (entidade as Entidade) : undefined,
        entidade_id: typeof entidade_id === 'string' ? entidade_id : undefined,
        q: typeof q === 'string' ? q : undefined,
        limit: typeof limit === 'string' ? Number(limit) || undefined : undefined,
      }),
    );
  }),
);
