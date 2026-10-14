import { db } from '../../db/index.js';
import {
  CAMPOS_CONTABIL,
  CAMPOS_IMOVEL,
  CAMPOS_IMOVEL_NUMERICOS,
  ETAPAS_INTEGRALIZACAO,
  FORMA_INTEGRALIZACAO,
} from '../contabil/contabil.campos.js';
import type { Coluna, Relatorio } from './relatorios.repository.js';

/**
 * Relatórios do setor contábil. Os dois primeiros espelham as planilhas do
 * setor — mesmas colunas, mesma ordem, mesmos grupos de cabeçalho —, para que
 * o .xlsx exportado substitua a planilha sem estranhamento.
 */

const GERAIS = 'Dados da empresa';

/** 'YYYY-MM-DD' -> 'DD/MM/AAAA' (ou '' se vazio). */
function fmtData(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** numeric (string) -> 'R$ 1.234,56'. */
function fmtMoeda(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isNaN(n)
    ? String(value)
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** Planilha "Informações Gerais" — um cliente por linha. */
export async function relInformacoesGeraisContabil(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('clientes')
    .leftJoin('cliente_contabil', 'cliente_contabil.cliente_id', 'clientes.id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'clientes.tipo_cliente',
      'clientes.situacao',
      'clientes.data_evento_situacao',
      'clientes.regime_tributacao',
      ...CAMPOS_CONTABIL.map((c) => `cliente_contabil.${c.key}` as const),
    ])
    .orderBy('clientes.codigo')
    .execute();

  // O regime fica no cadastro geral, mas a planilha o mostra no grupo tributário.
  const colunas: Coluna[] = [
    { key: 'codigo', label: 'Código da empresa' },
    { key: 'nome', label: 'Nome' },
    { key: 'cnpj', label: 'CNPJ', grupo: GERAIS },
    { key: 'tipo_cliente', label: 'Tipo de cliente', grupo: GERAIS },
    ...CAMPOS_CONTABIL.slice(0, 2).map(({ key, label, grupo }) => ({ key, label, grupo })),
    { key: 'situacao', label: 'Situação', grupo: GERAIS },
    { key: 'data_situacao', label: 'Data da situação', grupo: GERAIS },
    ...CAMPOS_CONTABIL.filter((c) => c.grupo === GERAIS)
      .slice(2)
      .map(({ key, label, grupo }) => ({ key, label, grupo })),
    { key: 'regime_tributacao', label: 'Regime de tributação', grupo: 'Informações tributárias' },
    ...CAMPOS_CONTABIL.filter((c) => c.grupo !== GERAIS).map(({ key, label, grupo }) => ({
      key,
      label,
      grupo,
    })),
  ];

  return {
    titulo: 'Informações gerais — setor contábil',
    colunas,
    linhas: rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const linha: Record<string, string | number | null> = {
        data_situacao: fmtData(r.data_evento_situacao),
      };
      for (const c of colunas) if (!(c.key in linha)) linha[c.key] = texto(row[c.key]);
      linha.codigo = r.codigo;
      return linha;
    }),
  };
}

/** Planilha "Controle de imóveis" (FRSoc-019) — um imóvel por linha. */
export async function relControleImoveis(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('imoveis')
    .innerJoin('clientes', 'clientes.id', 'imoveis.cliente_id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'imoveis.numero_ordem',
      ...CAMPOS_IMOVEL.map((c) => `imoveis.${c.key}` as const),
    ])
    .orderBy('clientes.nome')
    .orderBy('imoveis.numero_ordem')
    .execute();

  const colunas: Coluna[] = [
    { key: 'codigo', label: 'Código da empresa' },
    { key: 'nome', label: 'Cliente' },
    { key: 'numero_ordem', label: 'Número de ordem' },
    ...CAMPOS_IMOVEL.map(({ key, label, grupo }) => ({ key, label, grupo })),
  ];

  return {
    titulo: 'Controle de imóveis dos clientes',
    colunas,
    linhas: rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const linha: Record<string, string | number | null> = {
        codigo: r.codigo,
        nome: r.nome,
        numero_ordem: r.numero_ordem,
      };
      for (const c of CAMPOS_IMOVEL) {
        linha[c.key] = CAMPOS_IMOVEL_NUMERICOS.has(c.key) ? fmtMoeda(row[c.key]) : texto(row[c.key]);
      }
      return linha;
    }),
  };
}

/**
 * Integralizações em andamento: imóveis recebidos por integralização cuja
 * transferência para a holding ainda não foi dada como finalizada, com as
 * etapas que ainda não estão em "Sim".
 */
export async function relIntegralizacoesAndamento(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('imoveis')
    .innerJoin('clientes', 'clientes.id', 'imoveis.cliente_id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'imoveis.numero_ordem',
      'imoveis.matricula',
      'imoveis.municipio',
      ...ETAPAS_INTEGRALIZACAO.map((e) => `imoveis.${e}` as const),
    ])
    .where('imoveis.forma_aquisicao', '=', FORMA_INTEGRALIZACAO)
    .where((eb) =>
      eb.or([
        eb('imoveis.transferencia_finalizada', 'is', null),
        eb('imoveis.transferencia_finalizada', '!=', 'Sim'),
      ]),
    )
    .orderBy('clientes.nome')
    .orderBy('imoveis.numero_ordem')
    .execute();

  const rotulo = new Map<string, string>(CAMPOS_IMOVEL.map((c) => [c.key, c.label]));

  return {
    titulo: 'Integralizações em andamento',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'numero_ordem', label: 'Nº do imóvel' },
      { key: 'matricula', label: 'Matrícula' },
      { key: 'municipio', label: 'Município' },
      { key: 'progresso', label: 'Etapas concluídas' },
      { key: 'pendentes', label: 'Etapas pendentes' },
    ],
    linhas: rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const pendentes = ETAPAS_INTEGRALIZACAO.filter((e) => row[e] !== 'Sim');
      return {
        codigo: r.codigo,
        nome: r.nome,
        numero_ordem: r.numero_ordem,
        matricula: r.matricula ?? '',
        municipio: r.municipio ?? '',
        progresso: `${ETAPAS_INTEGRALIZACAO.length - pendentes.length} de ${ETAPAS_INTEGRALIZACAO.length}`,
        pendentes: pendentes.map((e) => rotulo.get(e)).join('; '),
      };
    }),
  };
}

/** Clientes por responsável e prioridade (carteira de cada contadora). */
export async function relClientesPorResponsavelContabil(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('clientes')
    .leftJoin('cliente_contabil', 'cliente_contabil.cliente_id', 'clientes.id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'clientes.situacao',
      'clientes.regime_tributacao',
      'cliente_contabil.responsavel',
      'cliente_contabil.prioridade',
      'cliente_contabil.grupo_empresarial',
    ])
    .orderBy('cliente_contabil.responsavel')
    .orderBy('clientes.nome')
    .execute();

  return {
    titulo: 'Clientes por responsável e prioridade',
    colunas: [
      { key: 'responsavel', label: 'Responsável' },
      { key: 'prioridade', label: 'Prioridade' },
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'grupo', label: 'Grupo empresarial' },
      { key: 'regime', label: 'Regime de tributação' },
      { key: 'situacao', label: 'Situação' },
    ],
    linhas: rows.map((r) => ({
      responsavel: r.responsavel ?? '',
      prioridade: r.prioridade ?? '',
      codigo: r.codigo,
      nome: r.nome,
      grupo: r.grupo_empresarial ?? '',
      regime: r.regime_tributacao ?? '',
      situacao: r.situacao,
    })),
  };
}
