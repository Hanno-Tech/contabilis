import { Router } from 'express';
import { asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  senhaSetorInputSchema,
  senhaSetorUpdateSchema,
  type SenhaSetorUpdate,
} from './senhas-setor.schema.js';
import * as repo from './senhas-setor.repository.js';

export const senhasSetorRouter = Router();
senhasSetorRouter.use(requireAuth);

// Listar com busca
senhasSetorRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    res.json(await repo.listSenhasSetor(typeof q === 'string' ? q : undefined));
  }),
);

// Revelar a senha descriptografada (antes de '/:id')
senhasSetorRouter.get(
  '/:id/senha',
  asyncHandler(async (req, res) => {
    const revelada = await repo.revelarSenhaSetor(req.params.id);
    if (!revelada) throw NotFound('Senha não encontrada');
    res.json(revelada);
  }),
);

senhasSetorRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const senha = await repo.getSenhaSetor(req.params.id);
    if (!senha) throw NotFound('Senha não encontrada');
    res.json(senha);
  }),
);

// Cadastrar
senhasSetorRouter.post(
  '/',
  validateBody(senhaSetorInputSchema),
  asyncHandler(async (req, res) => {
    const id = await repo.createSenhaSetor(req.body);
    res.status(201).json(await repo.getSenhaSetor(id));
  }),
);

// Editar (locking otimista)
senhasSetorRouter.put(
  '/:id',
  validateBody(senhaSetorUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as SenhaSetorUpdate;
    const before = await repo.getSenhaSetor(req.params.id);
    if (!before) throw NotFound('Senha não encontrada');
    const newVersion = await repo.updateSenhaSetor(req.params.id, version, input);
    if (newVersion === null) {
      throw Conflict('Esta senha foi alterada por outro usuário. Recarregue e tente novamente.');
    }
    res.json(await repo.getSenhaSetor(req.params.id));
  }),
);

// Excluir
senhasSetorRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const before = await repo.getSenhaSetor(req.params.id);
    if (!before) throw NotFound('Senha não encontrada');
    await repo.deleteSenhaSetor(req.params.id);
    res.status(204).end();
  }),
);
