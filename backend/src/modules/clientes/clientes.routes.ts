import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  clienteInputSchema,
  clienteUpdateSchema,
  folhaUpdateSchema,
  type ClienteUpdate,
  type FolhaUpdate,
} from './clientes.schema.js';
import { QUADROS, QUADROS_POR_TIPO } from './ficha.rules.js';
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

/**
 * Estrutura da ficha: quadros, campos e o que é exigido de cada tipo de
 * cliente. O formulário consome isto para decidir que quadros mostrar, e o
 * dashboard usa as mesmas regras para calcular a completude — uma definição só,
 * em `ficha.rules.ts`.
 */
clientesRouter.get('/estrutura-ficha', (_req, res) => {
  res.json({ quadros: QUADROS, quadrosPorTipo: QUADROS_POR_TIPO });
});

// Listar com busca e filtros
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

// Ficha completa (informações gerais + folha + credenciais) — tela "Informações Gerais"
clientesRouter.get(
  '/:id/ficha',
  asyncHandler(async (req, res) => {
    const ficha = await repo.getFicha(req.params.id);
    if (!ficha) throw NotFound('Cliente não encontrado');
    res.json(ficha);
  }),
);

// Revelar credenciais descriptografadas (RNF-02)
clientesRouter.get(
  '/:id/credenciais',
  asyncHandler(async (req, res) => {
    if (!(await repo.clienteExists(req.params.id))) throw NotFound('Cliente não encontrado');
    res.json(await repo.revelarCredenciais(req.params.id));
  }),
);

// Clientes do cliente — tela "Clientes"
clientesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cliente = await repo.getCliente(req.params.id);
    if (!cliente) throw NotFound('Cliente não encontrado');
    res.json(cliente);
  }),
);

// Cadastrar (informações gerais)
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

// Editar informações gerais (locking otimista — RNF-01)
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

// Editar dados de folha em diante (locking otimista)
clientesRouter.put(
  '/:id/folha',
  validateBody(folhaUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as FolhaUpdate;
    const before = await repo.getFicha(req.params.id);
    if (!before) throw NotFound('Cliente não encontrado');
    const newVersion = await repo.updateFolha(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Estes dados foram alterados por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getFicha(req.params.id);
    if (after) await audit.registrarClienteFolha(req.user!, before, after);
    res.json(after);
  }),
);
