import { Router } from 'express';
import type { Setor } from '../../db/types.js';
import { asyncHandler, NotFound } from '../../lib/errors.js';
import { setorDaQuery } from '../../lib/setor.js';
import { requireAuth } from '../../middleware/auth.js';
import * as repo from './relatorios.repository.js';
import * as contabil from './relatorios.contabil.js';
import * as personalizado from './relatorios.personalizado.js';
import { z } from 'zod';
import { BadRequest } from '../../lib/errors.js';

export const relatoriosRouter = Router();
relatoriosRouter.use(requireAuth);

/** Relatórios disponíveis (chave → setor, gerador e metadados para o menu). */
const RELATORIOS: Record<
  string,
  { setor: Setor; titulo: string; descricao: string; gerar: () => Promise<repo.Relatorio> }
> = {
  // ------------------------------------------------------------ Setor pessoal
  'fechamento-folha': {
    setor: 'pessoal',
    titulo: 'Fechamento da folha',
    descricao: 'Clientes com folha, nas colunas da planilha do setor.',
    gerar: repo.relFechamentoFolha,
  },
  'clientes-por-situacao': {
    setor: 'pessoal',
    titulo: 'Clientes por situação',
    descricao: 'Código, nome, situação e data da situação.',
    gerar: repo.relClientesPorSituacao,
  },
  'procuracoes-vencidas': {
    setor: 'pessoal',
    titulo: 'Procurações vencidas',
    descricao: 'Procurações ativas com data de vencimento no passado.',
    gerar: repo.relProcuracoesVencidas,
  },
  'vencimento-procuracoes': {
    setor: 'pessoal',
    titulo: 'Vencimento de procurações',
    descricao: 'Situação e vencimento das procurações e-Consignado e DET/FGTS e e-mails do DET.',
    gerar: repo.relVencimentoProcuracoes,
  },
  'laudos-vencidos': {
    setor: 'pessoal',
    titulo: 'Laudos de SST vencidos',
    descricao: 'Empresas com laudo atrasado, o vencimento e a empresa responsável pelo laudo.',
    gerar: repo.relLaudosVencidos,
  },
  'campos-nao-preenchidos': {
    setor: 'pessoal',
    titulo: 'Campos não preenchidos',
    descricao: 'Clientes com campos essenciais em branco.',
    gerar: repo.relCamposNaoPreenchidos,
  },
  'clientes-por-regime': {
    setor: 'pessoal',
    titulo: 'Clientes por regime de tributação',
    descricao: 'Código, nome e regime de tributação.',
    gerar: repo.relClientesPorRegime,
  },
  'pendencias-abertas': {
    setor: 'pessoal',
    titulo: 'Pendências em aberto',
    descricao: 'Apenas pendências com situação em aberto.',
    gerar: () => repo.relPendenciasAbertas('pessoal'),
  },
  'eventos-a-lancar': {
    setor: 'pessoal',
    titulo: 'Eventos futuros a lançar',
    descricao: 'Eventos futuros ainda não lançados.',
    gerar: () => repo.relEventosALancar('pessoal'),
  },
  // ----------------------------------------------------------- Setor contábil
  'contabil-informacoes-gerais': {
    setor: 'contabil',
    titulo: 'Informações gerais',
    descricao: 'Ficha contábil de todos os clientes, nas colunas da planilha do setor.',
    gerar: contabil.relInformacoesGeraisContabil,
  },
  'contabil-por-responsavel': {
    setor: 'contabil',
    titulo: 'Clientes por responsável',
    descricao: 'Carteira de cada responsável, com prioridade, grupo e regime.',
    gerar: contabil.relClientesPorResponsavelContabil,
  },
  'contabil-imoveis': {
    setor: 'contabil',
    titulo: 'Controle de imóveis',
    descricao: 'Imóveis dos clientes, nas colunas da planilha FRSoc-019.',
    gerar: contabil.relControleImoveis,
  },
  'contabil-integralizacoes': {
    setor: 'contabil',
    titulo: 'Integralizações em andamento',
    descricao: 'Imóveis em integralização ainda não finalizada e as etapas pendentes.',
    gerar: contabil.relIntegralizacoesAndamento,
  },
  'contabil-clientes-por-regime': {
    setor: 'contabil',
    titulo: 'Clientes por regime de tributação',
    descricao: 'Código, nome e regime de tributação.',
    gerar: repo.relClientesPorRegime,
  },
  'contabil-pendencias-abertas': {
    setor: 'contabil',
    titulo: 'Pendências em aberto',
    descricao: 'Apenas pendências com situação em aberto.',
    gerar: () => repo.relPendenciasAbertas('contabil'),
  },
  'contabil-eventos-a-lancar': {
    setor: 'contabil',
    titulo: 'Eventos futuros a lançar',
    descricao: 'Eventos futuros ainda não lançados.',
    gerar: () => repo.relEventosALancar('contabil'),
  },
};

// Catálogo dos relatórios do setor (para montar o menu)
relatoriosRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const setor = setorDaQuery(req.query.setor);
    res.json(
      Object.entries(RELATORIOS)
        .filter(([, r]) => r.setor === setor)
        .map(([key, r]) => ({ key, titulo: r.titulo, descricao: r.descricao })),
    );
  }),
);

// Relatório personalizado: catálogo de campos escolhíveis e geração
relatoriosRouter.get('/personalizado/campos', (_req, res) => {
  res.json(personalizado.catalogoPersonalizado());
});

const personalizadoSchema = z.object({
  campos: z.array(z.string()).min(1, 'Escolha ao menos um campo'),
  situacao: z.enum(['ativos', 'todos']).default('ativos'),
});

relatoriosRouter.post(
  '/personalizado',
  asyncHandler(async (req, res) => {
    const input = personalizadoSchema.parse(req.body);
    try {
      res.json(await personalizado.relPersonalizado(input));
    } catch (err) {
      if (err instanceof personalizado.CamposInvalidos) throw BadRequest(err.message);
      throw err;
    }
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
