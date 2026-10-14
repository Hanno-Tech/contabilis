import { Router } from 'express';
import { AppError, asyncHandler, Conflict, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { imovelInputSchema, imovelUpdateSchema, type ImovelInput, type ImovelUpdate } from './imoveis.schema.js';
import * as repo from './imoveis.repository.js';
import * as audit from '../audit/audit.repository.js';

/** Controle de imóveis dos clientes (setor contábil). */
export const imoveisRouter = Router();
imoveisRouter.use(requireAuth);

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** O número de ordem é único por cliente — avisa antes do banco recusar. */
async function garantirNumeroLivre(input: ImovelInput, ignorarId?: string) {
  if (!input.numero_ordem) return;
  if (await repo.numeroEmUso(input.cliente_id, input.numero_ordem, ignorarId)) {
    throw new AppError(
      409,
      `Este cliente já tem um imóvel com o número de ordem ${input.numero_ordem}.`,
      'UNIQUE_VIOLATION',
    );
  }
}

imoveisRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, cliente_id, tipo, situacao, forma_aquisicao } = req.query;
    res.json(
      await repo.listImoveis({
        q: str(q),
        cliente_id: str(cliente_id),
        tipo: str(tipo),
        situacao: str(situacao),
        forma_aquisicao: str(forma_aquisicao),
      }),
    );
  }),
);

imoveisRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const imovel = await repo.getImovel(req.params.id);
    if (!imovel) throw NotFound('Imóvel não encontrado');
    res.json(imovel);
  }),
);

imoveisRouter.post(
  '/',
  validateBody(imovelInputSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ImovelInput;
    await garantirNumeroLivre(input);
    const id = await repo.createImovel(input);
    const imovel = await repo.getImovel(id);
    if (imovel) await audit.registrarImovel(req.user!, 'criou', null, imovel);
    res.status(201).json(imovel);
  }),
);

// Editar (locking otimista)
imoveisRouter.put(
  '/:id',
  validateBody(imovelUpdateSchema),
  asyncHandler(async (req, res) => {
    const { version, ...input } = req.body as ImovelUpdate;
    const before = await repo.getImovel(req.params.id);
    if (!before) throw NotFound('Imóvel não encontrado');
    await garantirNumeroLivre(
      { ...input, numero_ordem: input.numero_ordem ?? before.numero_ordem },
      req.params.id,
    );
    const newVersion = await repo.updateImovel(req.params.id, version, input, before.numero_ordem);
    if (newVersion === null) {
      throw Conflict('Este imóvel foi alterado por outro usuário. Recarregue e tente novamente.');
    }
    const after = await repo.getImovel(req.params.id);
    if (after) await audit.registrarImovel(req.user!, 'editou', before, after);
    res.json(after);
  }),
);

imoveisRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const before = await repo.getImovel(req.params.id);
    if (!before) throw NotFound('Imóvel não encontrado');
    await repo.deleteImovel(req.params.id);
    await audit.registrarImovel(req.user!, 'excluiu', before, null);
    res.status(204).end();
  }),
);
