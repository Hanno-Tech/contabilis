import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { listSelectableUsers } from '../auth/users.js';
import {
  ocorrenciaInputSchema,
  ocorrenciaUpdateSchema,
  SITUACOES_OCORRENCIA,
  type OcorrenciaUpdate,
} from './ocorrencias.schema.js';
import * as repo from './ocorrencias.repository.js';
import * as audit from '../audit/audit.repository.js';

export const ocorrenciasRouter = Router();
ocorrenciasRouter.use(requireAuth);

// Opções para os selects do formulário/filtros (precisa vir antes de '/:id')
ocorrenciasRouter.get(
  '/opcoes',
  asyncHandler(async (_req, res) => {
    res.json({ usuarios: listSelectableUsers(), situacoes: [...SITUACOES_OCORRENCIA] });
  }),
);

// Listar com busca e filtros
ocorrenciasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, cliente_id, situacao, responsavel_id } = req.query;
    res.json(
      await repo.listOcorrencias({
        q: typeof q === 'string' ? q : undefined,
        cliente_id: typeof cliente_id === 'string' ? cliente_id : undefined,
        situacao: typeof situacao === 'string' ? situacao : undefined,
        responsavel_id: typeof responsavel_id === 'string' ? responsavel_id : undefined,
      }),
    );
  }),
);

ocorrenciasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ocorrencia = await repo.getOcorrencia(req.params.id);
    if (!ocorrencia) throw NotFound('Ocorrência não encontrada');
    res.json(ocorrencia);
  }),
);

// Cadastrar
ocorrenciasRouter.post(
  '/',
  validateBody(ocorrenciaInputSchema),
  asyncHandler(async (req, res) => {
    const id = await repo.createOcorrencia(req.body);
    const ocorrencia = await repo.getOcorrencia(id);
    if (ocorrencia) await audit.registrarOcorrencia(req.user!, 'criou', null, ocorrencia);
    res.status(201).json(ocorrencia);
  }),
);

// Editar / alterar status (locking otimista)
ocorrenciasRouter.put(
  '/:id',
  validateBody(ocorrenciaUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as OcorrenciaUpdate;
    const before = await repo.getOcorrencia(req.params.id);
    if (!before) throw NotFound('Ocorrência não encontrada');
    const newVersion = await repo.updateOcorrencia(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Esta ocorrência foi alterada por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getOcorrencia(req.params.id);
    if (after) await audit.registrarOcorrencia(req.user!, 'editou', before, after);
    res.json(after);
  }),
);

// Excluir
ocorrenciasRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const before = await repo.getOcorrencia(req.params.id);
    if (!before) throw NotFound('Ocorrência não encontrada');
    await repo.deleteOcorrencia(req.params.id);
    await audit.registrarOcorrencia(req.user!, 'excluiu', before, null);
    res.status(204).end();
  }),
);
