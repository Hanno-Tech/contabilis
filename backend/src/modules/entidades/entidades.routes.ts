import { Router } from 'express';
import { asyncHandler, BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  TIPOS_ENTIDADE,
  entidadeInputSchema,
  entidadeUpdateSchema,
  type EntidadeUpdate,
} from './entidades.schema.js';
import * as repo from './entidades.repository.js';

export const entidadesRouter = Router();
entidadesRouter.use(requireAuth);

// Tipos disponíveis para os selects/filtros (antes de '/:id')
entidadesRouter.get('/tipos', (_req, res) => {
  res.json({ tipos: [...TIPOS_ENTIDADE] });
});

// Listar com busca e filtro por tipo
entidadesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, tipo } = req.query;
    res.json(
      await repo.listEntidades({
        q: typeof q === 'string' ? q : undefined,
        tipo: typeof tipo === 'string' ? tipo : undefined,
      }),
    );
  }),
);

entidadesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const entidade = await repo.getEntidade(req.params.id);
    if (!entidade) throw NotFound('Registro não encontrado');
    res.json(entidade);
  }),
);

// Cadastrar
entidadesRouter.post(
  '/',
  validateBody(entidadeInputSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as EntidadeUpdate;
    if (await repo.nomeEmUso(input.tipo, input.nome)) {
      throw BadRequest(`Já existe um cadastro de "${input.tipo}" com esse nome.`);
    }
    const id = await repo.createEntidade(input);
    res.status(201).json(await repo.getEntidade(id));
  }),
);

// Editar (locking otimista)
entidadesRouter.put(
  '/:id',
  validateBody(entidadeUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as EntidadeUpdate;
    const before = await repo.getEntidade(req.params.id);
    if (!before) throw NotFound('Registro não encontrado');
    if (await repo.nomeEmUso(input.tipo, input.nome, req.params.id)) {
      throw BadRequest(`Já existe um cadastro de "${input.tipo}" com esse nome.`);
    }
    const newVersion = await repo.updateEntidade(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Este registro foi alterado por outro usuário. Recarregue e tente novamente.');
    }
    res.json(await repo.getEntidade(req.params.id));
  }),
);

// Excluir
entidadesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const before = await repo.getEntidade(req.params.id);
    if (!before) throw NotFound('Registro não encontrado');
    await repo.deleteEntidade(req.params.id);
    res.status(204).end();
  }),
);
