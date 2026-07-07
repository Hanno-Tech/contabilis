import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { listSelectableUsers } from '../auth/users.js';
import {
  pendenciaInputSchema,
  pendenciaUpdateSchema,
  SITUACOES_PENDENCIA,
  type PendenciaUpdate,
} from './pendencias.schema.js';
import * as repo from './pendencias.repository.js';
import * as audit from '../audit/audit.repository.js';

export const pendenciasRouter = Router();
pendenciasRouter.use(requireAuth);

/** Data do dia (servidor) no formato YYYY-MM-DD. */
const hoje = () => new Date().toISOString().slice(0, 10);

// Opções para selects/filtros (antes de '/:id')
pendenciasRouter.get(
  '/opcoes',
  asyncHandler(async (_req, res) => {
    res.json({ usuarios: listSelectableUsers(), situacoes: [...SITUACOES_PENDENCIA] });
  }),
);

// Listar com busca e filtros
pendenciasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, cliente_id, situacao, solucao_id } = req.query;
    res.json(
      await repo.listPendencias({
        q: typeof q === 'string' ? q : undefined,
        cliente_id: typeof cliente_id === 'string' ? cliente_id : undefined,
        situacao: typeof situacao === 'string' ? situacao : undefined,
        solucao_id: typeof solucao_id === 'string' ? solucao_id : undefined,
      }),
    );
  }),
);

pendenciasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const pendencia = await repo.getPendencia(req.params.id);
    if (!pendencia) throw NotFound('Pendência não encontrada');
    res.json(pendencia);
  }),
);

// Cadastrar — data e usuário que cadastrou são gravados pelo servidor
pendenciasRouter.post(
  '/',
  validateBody(pendenciaInputSchema),
  asyncHandler(async (req, res) => {
    const id = await repo.createPendencia(
      req.body,
      { id: req.user!.id, nome: req.user!.name },
      hoje(),
    );
    const pendencia = await repo.getPendencia(id);
    if (pendencia) await audit.registrarPendencia(req.user!, 'criou', null, pendencia);
    res.status(201).json(pendencia);
  }),
);

// Editar / alterar situação (locking otimista)
pendenciasRouter.put(
  '/:id',
  validateBody(pendenciaUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as PendenciaUpdate;
    const before = await repo.getPendencia(req.params.id);
    if (!before) throw NotFound('Pendência não encontrada');
    const newVersion = await repo.updatePendencia(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Esta pendência foi alterada por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getPendencia(req.params.id);
    if (after) await audit.registrarPendencia(req.user!, 'editou', before, after);
    res.json(after);
  }),
);

// Excluir
pendenciasRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const before = await repo.getPendencia(req.params.id);
    if (!before) throw NotFound('Pendência não encontrada');
    await repo.deletePendencia(req.params.id);
    await audit.registrarPendencia(req.user!, 'excluiu', before, null);
    res.status(204).end();
  }),
);
