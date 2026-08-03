import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { decrypt, encrypt } from '../../lib/crypto.js';
import type { ClienteInput, FolhaInput } from './clientes.schema.js';

export interface ClienteFilters {
  q?: string;
  situacao?: string;
  responsavel?: string;
  regime?: string;
}

const numToStr = (n: number | null | undefined): string | null =>
  n === null || n === undefined ? null : String(n);

// ------------------------------------------------- Clientes (clientes)

/** Colunas escalares gerais do cliente. */
function generalColumns(input: ClienteInput) {
  return {
    codigo: input.codigo,
    nome: input.nome,
    cnpj: input.cnpj ?? null,
    tipo_cliente: input.tipo_cliente ?? null,
    regime_tributacao: input.regime_tributacao ?? null,
    situacao: input.situacao,
    data_evento_situacao: input.data_evento_situacao ?? null,
    responsavel: input.responsavel ?? null,
  };
}

const CLIENTE_COLUMNS = [
  'clientes.id',
  'clientes.codigo',
  'clientes.nome',
  'clientes.cnpj',
  'clientes.tipo_cliente',
  'clientes.regime_tributacao',
  'clientes.situacao',
  'clientes.data_evento_situacao',
  'clientes.responsavel',
  'clientes.version',
  'clientes.created_at',
  'clientes.updated_at',
] as const;

export async function listClientes(filters: ClienteFilters) {
  let query = db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'clientes.tipo_cliente',
      'clientes.situacao',
      'clientes.data_evento_situacao',
      'clientes.responsavel',
      'clientes.regime_tributacao',
      'cliente_folha.convencao_aplicavel_nome as convencao_nome',
    ]);

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('clientes.nome', 'ilike', term),
        eb('clientes.cnpj', 'ilike', term),
        eb(sql`clientes.codigo::text`, 'ilike', term),
      ]),
    );
  }
  if (filters.situacao) query = query.where('clientes.situacao', '=', filters.situacao);
  if (filters.responsavel) query = query.where('clientes.responsavel', '=', filters.responsavel);
  if (filters.regime) query = query.where('clientes.regime_tributacao', '=', filters.regime);

  return query.orderBy('clientes.nome').execute();
}

/** Valores distintos para alimentar os filtros do frontend. */
export async function listFiltros() {
  const distinct = async (col: 'situacao' | 'responsavel' | 'regime_tributacao') => {
    const rows = await db
      .selectFrom('clientes')
      .select(col)
      .distinct()
      .where(col, 'is not', null)
      .orderBy(col)
      .execute();
    return rows.map((r) => r[col]).filter((v): v is string => !!v);
  };
  const [situacoes, responsaveis, regimes] = await Promise.all([
    distinct('situacao'),
    distinct('responsavel'),
    distinct('regime_tributacao'),
  ]);
  return { situacoes, responsaveis, regimes };
}

/** Clientes do cliente (para a tela "Clientes"). */
export async function getCliente(id: string) {
  return db
    .selectFrom('clientes')
    .select(CLIENTE_COLUMNS)
    .where('clientes.id', '=', id)
    .executeTakeFirst();
}

export async function clienteExists(id: string): Promise<boolean> {
  const row = await db.selectFrom('clientes').select('id').where('id', '=', id).executeTakeFirst();
  return !!row;
}

export async function createCliente(input: ClienteInput): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const row = await trx
      .insertInto('clientes')
      .values(generalColumns(input))
      .returning('id')
      .executeTakeFirstOrThrow();
    // Cria a linha 1:1 de folha (vazia) já na criação, garantindo o vínculo.
    await trx.insertInto('cliente_folha').values({ cliente_id: row.id }).execute();
    return row.id;
  });
}

export async function updateCliente(
  id: string,
  expectedVersion: number,
  input: ClienteInput,
): Promise<number | null> {
  const updated = await db
    .updateTable('clientes')
    .set({ ...generalColumns(input), version: expectedVersion + 1 })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

// ----------------------------------------------- Dados de folha (cliente_folha)

const FOLHA_COLUMNS = [
  'cliente_folha.possui_folha',
  'cliente_folha.forma_pagamento_salarios',
  'cliente_folha.apura_ponto_escritorio',
  'cliente_folha.realiza_lancamentos',
  'cliente_folha.concede_plano_saude',
  'cliente_folha.plano_operadora',
  'cliente_folha.plano_beneficiarios',
  'cliente_folha.fator_r',
  'cliente_folha.atividade_concomitante',
  'cliente_folha.construcao_civil',
  'cliente_folha.cprb',
  'cliente_folha.encargos_recolhidos_escritorio',
  'cliente_folha.observacoes_folha',
  'cliente_folha.prazo_envio_folhas',
  'cliente_folha.folha_rotina_automatica',
  'cliente_folha.prazo_contrato_experiencia',
  'cliente_folha.lancamentos_fixos',
  'cliente_folha.particularidades_cliente',
  'cliente_folha.relatorios_admissao',
  'cliente_folha.envio_meio',
  'cliente_folha.envio_documento',
  'cliente_folha.envio_contato',
  'cliente_folha.sindicato',
  'cliente_folha.convencao_aplicavel_nome',
  'cliente_folha.possui_laudos_sst',
  'cliente_folha.empresa_responsavel_sst',
  'cliente_folha.data_vencimento_laudo',
  'cliente_folha.data_vencimento_laudo_situacao',
  'cliente_folha.venc_procuracao_rfb',
  'cliente_folha.venc_procuracao_rfb_situacao',
  'cliente_folha.venc_procuracao_det_fgts',
  'cliente_folha.venc_procuracao_det_fgts_situacao',
  'cliente_folha.venc_procuracao_econsignado_situacao',
  'cliente_folha.venc_procuracao_det_fgts',
  'cliente_folha.venc_procuracao_econsignado',
  'cliente_folha.emails_notificacao_det',
  'cliente_folha.inss_tipo_segurado',
  'cliente_folha.inss_nit',
  'cliente_folha.inss_codigo_recolhimento',
  'cliente_folha.inss_opcao_recolhimento',
  'cliente_folha.inss_salario_contribuicao',
  'cliente_folha.inss_aliquota',
  // Reorganização da ficha (novos campos)
  'cliente_folha.inss_retido_nf',
  'cliente_folha.cargos_insalubres_perigosos',
  'cliente_folha.responsavel_fechamento_folha',
  'cliente_folha.codigo_rotina_automatica',
  'cliente_folha.data_meta_entrega_folha',
  'cliente_folha.termo_ciencia_sst',
  'cliente_folha.envio_observacoes',
  'cliente_folha.venc_procuracao_det',
  'cliente_folha.venc_procuracao_fgts',
  'cliente_folha.version',
] as const;

/** Colunas escalares da folha a partir da entrada validada. */
function folhaColumns(input: FolhaInput) {
  return {
    possui_folha: input.possui_folha ?? null,
    forma_pagamento_salarios: input.forma_pagamento_salarios ?? null,
    apura_ponto_escritorio: input.apura_ponto_escritorio ?? null,
    realiza_lancamentos: input.realiza_lancamentos ?? null,
    concede_plano_saude: input.concede_plano_saude ?? null,
    plano_operadora: input.plano_operadora ?? null,
    plano_beneficiarios: input.plano_beneficiarios ?? null,
    fator_r: input.fator_r ?? null,
    atividade_concomitante: input.atividade_concomitante ?? null,
    construcao_civil: input.construcao_civil ?? null,
    cprb: input.cprb ?? null,
    encargos_recolhidos_escritorio: input.encargos_recolhidos_escritorio ?? null,
    observacoes_folha: input.observacoes_folha ?? null,
    prazo_envio_folhas: input.prazo_envio_folhas ?? null,
    inss_retido_nf: input.inss_retido_nf ?? null,
    folha_rotina_automatica: input.folha_rotina_automatica ?? null,
    responsavel_fechamento_folha: input.responsavel_fechamento_folha ?? null,
    codigo_rotina_automatica: input.codigo_rotina_automatica ?? null,
    data_meta_entrega_folha: input.data_meta_entrega_folha ?? null,
    prazo_contrato_experiencia: input.prazo_contrato_experiencia ?? null,
    lancamentos_fixos: input.lancamentos_fixos ?? null,
    particularidades_cliente: input.particularidades_cliente ?? null,
    relatorios_admissao: input.relatorios_admissao ?? null,
    cargos_insalubres_perigosos: input.cargos_insalubres_perigosos ?? null,
    envio_meio: input.envio_meio ?? null,
    envio_documento: input.envio_documento ?? null,
    envio_contato: input.envio_contato ?? null,
    envio_observacoes: input.envio_observacoes ?? null,
    possui_laudos_sst: input.possui_laudos_sst ?? null,
    empresa_responsavel_sst: input.empresa_responsavel_sst ?? null,
    data_vencimento_laudo: input.data_vencimento_laudo ?? null,
    data_vencimento_laudo_situacao: input.data_vencimento_laudo_situacao ?? null,
    termo_ciencia_sst: input.termo_ciencia_sst ?? null,
    venc_procuracao_rfb: input.venc_procuracao_rfb ?? null,
    venc_procuracao_det: input.venc_procuracao_det ?? null,
    venc_procuracao_fgts: input.venc_procuracao_fgts ?? null,
    venc_procuracao_econsignado: input.venc_procuracao_econsignado ?? null,
    emails_notificacao_det: input.emails_notificacao_det ?? null,
    inss_tipo_segurado: input.inss_tipo_segurado ?? null,
    inss_nit: input.inss_nit ?? null,
    inss_codigo_recolhimento: input.inss_codigo_recolhimento ?? null,
    inss_opcao_recolhimento: input.inss_opcao_recolhimento ?? null,
    inss_salario_contribuicao: numToStr(input.inss_salario_contribuicao),
    inss_aliquota: numToStr(input.inss_aliquota),
    // Espelho do 1º sindicato/convenção (mantém dashboard/lista funcionando).
    sindicato: input.sindicatos?.[0]?.sindicato ?? null,
    convencao_aplicavel_nome: input.sindicatos?.[0]?.convencao_aplicavel_nome ?? null,
  };
}

/** Ficha completa: informações gerais + folha + credenciais (tela "Informações Gerais"). */
export async function getFicha(id: string) {
  const cliente = await db
    .selectFrom('clientes')
    .select(CLIENTE_COLUMNS)
    .where('clientes.id', '=', id)
    .executeTakeFirst();
  if (!cliente) return null;

  const folha = await db
    .selectFrom('cliente_folha')
    .select([...FOLHA_COLUMNS])
    .where('cliente_folha.cliente_id', '=', id)
    .executeTakeFirst();

  const sindicatos = await db
    .selectFrom('cliente_sindicatos')
    .select([
      'cliente_sindicatos.id',
      'cliente_sindicatos.sindicato',
      'cliente_sindicatos.convencao_aplicavel_nome',
      'cliente_sindicatos.situacao_convencao',
      'cliente_sindicatos.recolhe_contribuicao',
      'cliente_sindicatos.ordem',
    ])
    .where('cliente_sindicatos.cliente_id', '=', id)
    .orderBy('cliente_sindicatos.ordem')
    .execute();

  const credenciais = await getCredenciaisMascaradas(id);
  return { ...cliente, folha: folha ?? null, sindicatos, credenciais };
}

export async function updateFolha(
  id: string,
  expectedVersion: number,
  input: FolhaInput,
): Promise<number | null> {
  return db.transaction().execute(async (trx) => {
    const updated = await trx
      .updateTable('cliente_folha')
      .set({ ...folhaColumns(input), version: expectedVersion + 1 })
      .where('cliente_id', '=', id)
      .where('version', '=', expectedVersion)
      .returning('version')
      .executeTakeFirst();
    if (!updated) return null; // conflito de versão
    await replaceSindicatos(trx as typeof db, id, input.sindicatos);
    await reconcileCredenciais(trx as typeof db, id, input.credenciais);
    return updated.version;
  });
}

/** Substitui a lista de sindicatos/convenções do cliente. */
async function replaceSindicatos(
  trx: typeof db,
  clienteId: string,
  sindicatos: FolhaInput['sindicatos'],
): Promise<void> {
  if (sindicatos === undefined) return; // não enviado — não mexe
  await trx.deleteFrom('cliente_sindicatos').where('cliente_id', '=', clienteId).execute();
  const rows = sindicatos
    .filter(
      (s) =>
        s.sindicato ||
        s.convencao_aplicavel_nome ||
        s.situacao_convencao ||
        s.recolhe_contribuicao,
    )
    .map((s, i) => ({
      cliente_id: clienteId,
      sindicato: s.sindicato ?? null,
      convencao_aplicavel_nome: s.convencao_aplicavel_nome ?? null,
      situacao_convencao: s.situacao_convencao ?? null,
      recolhe_contribuicao: s.recolhe_contribuicao ?? null,
      ordem: i,
    }));
  if (rows.length) await trx.insertInto('cliente_sindicatos').values(rows).execute();
}

// ------------------------------------------------------ Credenciais (sensíveis)

type CredInput = NonNullable<FolhaInput['credenciais']>;

const EMPREGADO_DOMESTICO = 'empregado_domestico';

/**
 * Reconcilia as credenciais:
 *  - `orgaos` (quadro SENHAS) são a lista autoritativa, casada por `id`.
 *  - `empregado_domestico` é tratado à parte (quadro próprio, chave fixa).
 * A senha só é recifrada quando uma nova é informada; em branco, mantém a atual.
 */
async function reconcileCredenciais(
  trx: typeof db,
  clienteId: string,
  credenciais: CredInput | undefined,
): Promise<void> {
  if (!credenciais) return;

  const existing = await trx
    .selectFrom('cliente_credenciais')
    .select(['id', 'tipo', 'senha_cipher'])
    .where('cliente_id', '=', clienteId)
    .execute();
  const byId = new Map(existing.map((e) => [e.id, e]));
  const resolveCipher = (incoming: string | null | undefined, current: string | null) =>
    incoming ? encrypt(incoming) : current;

  const orgaos = (credenciais.orgaos ?? []).filter((o) => o.tipo.trim());
  const keepIds = new Set(orgaos.map((o) => o.id).filter((v): v is string => !!v));

  // Remove órgãos que saíram da lista (empregado doméstico é preservado à parte).
  const toDelete = existing
    .filter((e) => e.tipo !== EMPREGADO_DOMESTICO && !keepIds.has(e.id))
    .map((e) => e.id);
  if (toDelete.length) {
    await trx.deleteFrom('cliente_credenciais').where('id', 'in', toDelete).execute();
  }

  for (const o of orgaos) {
    const cur = o.id ? byId.get(o.id) : undefined;
    if (cur) {
      await trx
        .updateTable('cliente_credenciais')
        .set({
          tipo: o.tipo.trim(),
          link: o.link ?? null,
          usuario: o.usuario ?? null,
          senha_cipher: resolveCipher(o.senha, cur.senha_cipher),
        })
        .where('id', '=', cur.id)
        .execute();
    } else {
      await trx
        .insertInto('cliente_credenciais')
        .values({
          cliente_id: clienteId,
          tipo: o.tipo.trim(),
          link: o.link ?? null,
          usuario: o.usuario ?? null,
          senha_cipher: resolveCipher(o.senha, null),
          email: null,
          email_senha_cipher: null,
        })
        .execute();
    }
  }

  const ed = credenciais.empregado_domestico;
  if (ed) {
    const cur = existing.find((e) => e.tipo === EMPREGADO_DOMESTICO);
    if (ed.usuario || ed.senha || cur) {
      await trx
        .insertInto('cliente_credenciais')
        .values({
          cliente_id: clienteId,
          tipo: EMPREGADO_DOMESTICO,
          link: null,
          usuario: ed.usuario ?? null,
          senha_cipher: resolveCipher(ed.senha, cur?.senha_cipher ?? null),
          email: null,
          email_senha_cipher: null,
        })
        .onConflict((oc) =>
          oc.columns(['cliente_id', 'tipo']).doUpdateSet((eb) => ({
            usuario: eb.ref('excluded.usuario'),
            senha_cipher: eb.ref('excluded.senha_cipher'),
          })),
        )
        .execute();
    }
  }
}

/** Resumo "mascarado" das credenciais — nunca devolve a senha em claro. */
async function getCredenciaisMascaradas(clienteId: string) {
  const rows = await db
    .selectFrom('cliente_credenciais')
    .select(['id', 'tipo', 'link', 'usuario', 'senha_cipher', 'email', 'email_senha_cipher'])
    .where('cliente_id', '=', clienteId)
    .orderBy('tipo')
    .execute();
  return rows.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    link: r.link,
    usuario: r.usuario,
    email: r.email,
    tem_senha: !!r.senha_cipher,
    tem_email_senha: !!r.email_senha_cipher,
  }));
}

/** Revela as credenciais descriptografadas (RNF-02 — endpoint dedicado). */
export async function revelarCredenciais(clienteId: string) {
  const rows = await db
    .selectFrom('cliente_credenciais')
    .select(['id', 'tipo', 'link', 'usuario', 'senha_cipher', 'email', 'email_senha_cipher'])
    .where('cliente_id', '=', clienteId)
    .execute();
  return rows.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    link: r.link,
    usuario: r.usuario,
    email: r.email,
    senha: decrypt(r.senha_cipher),
    email_senha: decrypt(r.email_senha_cipher),
  }));
}
