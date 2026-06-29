import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { cctInputSchema, cctUpdateSchema, type CctUpdate } from './cct.schema.js';
import * as repo from './cct.repository.js';
import * as audit from '../audit/audit.repository.js';

export const cctRouter = Router();
cctRouter.use(requireAuth);

// RF-20 — listar convenções
cctRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await repo.listConvencoes());
  }),
);

// RF-21 — ficha completa
cctRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cct = await repo.getConvencao(req.params.id);
    if (!cct) throw NotFound('Convenção não encontrada');
    res.json(cct);
  }),
);

// RF-23 — clientes vinculados
cctRouter.get(
  '/:id/clientes',
  asyncHandler(async (req, res) => {
    if (!(await repo.convencaoExists(req.params.id))) throw NotFound('Convenção não encontrada');
    res.json(await repo.listClientesDaConvencao(req.params.id));
  }),
);

// RF-22 — cadastrar
cctRouter.post(
  '/',
  validateBody(cctInputSchema),
  asyncHandler(async (req, res) => {
    const id = await repo.createConvencao(req.body);
    const cct = await repo.getConvencao(id);
    if (cct) await audit.registrarConvencao(req.user!, 'criou', null, cct);
    res.status(201).json(cct);
  }),
);

// RF-22 — editar (com locking otimista)
cctRouter.put(
  '/:id',
  validateBody(cctUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as CctUpdate;
    const before = await repo.getConvencao(req.params.id);
    if (!before) throw NotFound('Convenção não encontrada');
    const newVersion = await repo.updateConvencao(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Esta convenção foi alterada por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getConvencao(req.params.id);
    if (after) await audit.registrarConvencao(req.user!, 'editou', before, after);
    res.json(after);
  }),
);
