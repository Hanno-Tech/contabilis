import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  clienteInputSchema,
  clienteUpdateSchema,
  type ClienteUpdate,
} from './clientes.schema.js';
import * as repo from './clientes.repository.js';
import * as audit from '../audit/audit.repository.js';

export const clientesRouter = Router();
clientesRouter.use(requireAuth);

// Valores distintos para os filtros (precisa vir antes de '/:id')
clientesRouter.get(
  '/filtros',
  asyncHandler(async (_req, res) => {
    res.json(await repo.listFiltros());
  }),
);

// RF-10/11/12 — listar com busca e filtros
clientesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, situacao, responsavel, regime } = req.query;
    res.json(
      await repo.listClientes({
        q: typeof q === 'string' ? q : undefined,
        situacao: typeof situacao === 'string' ? situacao : undefined,
        responsavel: typeof responsavel === 'string' ? responsavel : undefined,
        regime: typeof regime === 'string' ? regime : undefined,
      }),
    );
  }),
);

// RF-13 — ficha completa
clientesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cliente = await repo.getCliente(req.params.id);
    if (!cliente) throw NotFound('Cliente não encontrado');
    res.json(cliente);
  }),
);

// RNF-02 — revelar credenciais descriptografadas
clientesRouter.get(
  '/:id/credenciais',
  asyncHandler(async (req, res) => {
    if (!(await repo.clienteExists(req.params.id))) throw NotFound('Cliente não encontrado');
    res.json(await repo.revelarCredenciais(req.params.id));
  }),
);

// RF-14 — cadastrar
clientesRouter.post(
  '/',
  validateBody(clienteInputSchema),
  asyncHandler(async (req, res) => {
    const id = await repo.createCliente(req.body);
    const cliente = await repo.getCliente(id);
    if (cliente) await audit.registrarCliente(req.user!, 'criou', null, cliente);
    res.status(201).json(cliente);
  }),
);

// RF-15 — editar (com locking otimista — RNF-01)
clientesRouter.put(
  '/:id',
  validateBody(clienteUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as ClienteUpdate;
    const before = await repo.getCliente(req.params.id);
    if (!before) throw NotFound('Cliente não encontrado');
    const newVersion = await repo.updateCliente(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Este cliente foi alterado por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getCliente(req.params.id);
    if (after) await audit.registrarCliente(req.user!, 'editou', before, after);
    res.json(after);
  }),
);
