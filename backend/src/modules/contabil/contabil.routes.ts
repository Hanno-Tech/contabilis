import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { contabilUpdateSchema, type ContabilUpdate } from './contabil.schema.js';
import * as repo from './contabil.repository.js';
import * as audit from '../audit/audit.repository.js';

/** Informações gerais do setor contábil (ficha contábil do cliente). */
export const contabilRouter = Router();
contabilRouter.use(requireAuth);

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

contabilRouter.get(
  '/clientes/filtros',
  asyncHandler(async (_req, res) => {
    res.json(await repo.listFiltrosContabil());
  }),
);

contabilRouter.get(
  '/clientes',
  asyncHandler(async (req, res) => {
    const { q, situacao, responsavel, prioridade, grupo, regime } = req.query;
    res.json(
      await repo.listClientesContabil({
        q: str(q),
        situacao: str(situacao),
        responsavel: str(responsavel),
        prioridade: str(prioridade),
        grupo: str(grupo),
        regime: str(regime),
      }),
    );
  }),
);

contabilRouter.get(
  '/clientes/:id',
  asyncHandler(async (req, res) => {
    const ficha = await repo.getFichaContabil(req.params.id);
    if (!ficha) throw NotFound('Cliente não encontrado');
    res.json(ficha);
  }),
);

// Editar a ficha contábil (locking otimista — RNF-01)
contabilRouter.put(
  '/clientes/:id',
  validateBody(contabilUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as ContabilUpdate;
    const before = await repo.getFichaContabil(req.params.id);
    if (!before) throw NotFound('Cliente não encontrado');
    const newVersion = await repo.updateContabil(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Estes dados foram alterados por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getFichaContabil(req.params.id);
    if (after) await audit.registrarClienteContabil(req.user!, before, after);
    res.json(after);
  }),
);
