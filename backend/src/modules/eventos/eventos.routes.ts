import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { listSelectableUsers } from '../auth/usuarios.repository.js';
import {
  eventoInputSchema,
  eventoUpdateSchema,
  SITUACOES_EVENTO,
  type EventoUpdate,
} from './eventos.schema.js';
import * as repo from './eventos.repository.js';
import * as audit from '../audit/audit.repository.js';

export const eventosRouter = Router();
eventosRouter.use(requireAuth);

// Opções para selects/filtros (antes de '/:id')
eventosRouter.get(
  '/opcoes',
  asyncHandler(async (_req, res) => {
    res.json({ usuarios: await listSelectableUsers(), situacoes: [...SITUACOES_EVENTO] });
  }),
);

// Listar com busca e filtros
eventosRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, cliente_id, situacao, comp_de, comp_ate } = req.query;
    res.json(
      await repo.listEventos({
        q: typeof q === 'string' ? q : undefined,
        cliente_id: typeof cliente_id === 'string' ? cliente_id : undefined,
        situacao: typeof situacao === 'string' ? situacao : undefined,
        comp_de: typeof comp_de === 'string' ? comp_de : undefined,
        comp_ate: typeof comp_ate === 'string' ? comp_ate : undefined,
      }),
    );
  }),
);

eventosRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const evento = await repo.getEvento(req.params.id);
    if (!evento) throw NotFound('Evento não encontrado');
    res.json(evento);
  }),
);

// Cadastrar — usuário que lançou vem da sessão
eventosRouter.post(
  '/',
  validateBody(eventoInputSchema),
  asyncHandler(async (req, res) => {
    const id = await repo.createEvento(req.body, { id: req.user!.id, nome: req.user!.name });
    const evento = await repo.getEvento(id);
    if (evento) await audit.registrarEvento(req.user!, 'criou', null, evento);
    res.status(201).json(evento);
  }),
);

// Editar / alterar situação (locking otimista)
eventosRouter.put(
  '/:id',
  validateBody(eventoUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as EventoUpdate;
    const before = await repo.getEvento(req.params.id);
    if (!before) throw NotFound('Evento não encontrado');
    const newVersion = await repo.updateEvento(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Este evento foi alterado por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getEvento(req.params.id);
    if (after) await audit.registrarEvento(req.user!, 'editou', before, after);
    res.json(after);
  }),
);

// Excluir
eventosRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const before = await repo.getEvento(req.params.id);
    if (!before) throw NotFound('Evento não encontrado');
    await repo.deleteEvento(req.params.id);
    await audit.registrarEvento(req.user!, 'excluiu', before, null);
    res.status(204).end();
  }),
);
