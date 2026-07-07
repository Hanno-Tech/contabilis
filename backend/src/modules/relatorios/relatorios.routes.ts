import { Router } from 'express';
import { asyncHandler, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import * as repo from './relatorios.repository.js';

export const relatoriosRouter = Router();
relatoriosRouter.use(requireAuth);

/** Relatórios disponíveis (chave → gerador + metadados para o menu). */
const RELATORIOS: Record<
  string,
  { titulo: string; descricao: string; gerar: () => Promise<repo.Relatorio> }
> = {
  'fechamento-folha': {
    titulo: 'Fechamento da folha',
    descricao: 'Clientes com folha e os dados da rotina de fechamento.',
    gerar: repo.relFechamentoFolha,
  },
  'clientes-por-situacao': {
    titulo: 'Clientes por situação',
    descricao: 'Código, nome, situação e data da situação.',
    gerar: repo.relClientesPorSituacao,
  },
  'procuracoes-vencidas': {
    titulo: 'Procurações vencidas',
    descricao: 'Procurações com data de vencimento no passado.',
    gerar: repo.relProcuracoesVencidas,
  },
  'campos-nao-preenchidos': {
    titulo: 'Campos não preenchidos',
    descricao: 'Clientes com campos essenciais em branco.',
    gerar: repo.relCamposNaoPreenchidos,
  },
  'clientes-por-regime': {
    titulo: 'Clientes por regime de tributação',
    descricao: 'Código, nome e regime de tributação.',
    gerar: repo.relClientesPorRegime,
  },
  'pendencias-abertas': {
    titulo: 'Pendências em aberto',
    descricao: 'Apenas pendências com situação em aberto.',
    gerar: repo.relPendenciasAbertas,
  },
  'eventos-a-lancar': {
    titulo: 'Eventos futuros a lançar',
    descricao: 'Eventos futuros ainda não lançados.',
    gerar: repo.relEventosALancar,
  },
};

// Catálogo dos relatórios disponíveis (para montar o menu)
relatoriosRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(
      Object.entries(RELATORIOS).map(([key, r]) => ({
        key,
        titulo: r.titulo,
        descricao: r.descricao,
      })),
    );
  }),
);

// Dados de um relatório específico
relatoriosRouter.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const rel = RELATORIOS[req.params.key];
    if (!rel) throw NotFound('Relatório não encontrado');
    res.json(await rel.gerar());
  }),
);
