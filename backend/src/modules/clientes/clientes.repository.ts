import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { decrypt, encrypt } from '../../lib/crypto.js';
import type { ClienteInput } from './clientes.schema.js';

export interface ClienteFilters {
  q?: string;
  situacao?: string;
  responsavel?: string;
  regime?: string;
}

const numToStr = (n: number | null | undefined): string | null =>
  n === null || n === undefined ? null : String(n);

/** Colunas escalares do cliente (sem credenciais). */
function mainColumns(input: ClienteInput) {
  const { credenciais, codigo, ...rest } = input;
  return {
    codigo,
    nome: rest.nome,
    cnpj: rest.cnpj ?? null,
    tipo_cliente: rest.tipo_cliente ?? null,
    regime_tributacao: rest.regime_tributacao ?? null,
    situacao: rest.situacao,
    data_evento_situacao: rest.data_evento_situacao ?? null,
    responsavel: rest.responsavel ?? null,
    possui_folha: rest.possui_folha ?? null,
    forma_pagamento_salarios: rest.forma_pagamento_salarios ?? null,
    apura_ponto_escritorio: rest.apura_ponto_escritorio ?? null,
    realiza_lancamentos: rest.realiza_lancamentos ?? null,
    concede_plano_saude: rest.concede_plano_saude ?? null,
    plano_operadora: rest.plano_operadora ?? null,
    plano_beneficiarios: rest.plano_beneficiarios ?? null,
    fator_r: rest.fator_r ?? null,
    atividade_concomitante: rest.atividade_concomitante ?? null,
    construcao_civil: rest.construcao_civil ?? null,
    cprb: rest.cprb ?? null,
    observacoes_folha: rest.observacoes_folha ?? null,
    prazo_envio_folhas: rest.prazo_envio_folhas ?? null,
    folha_rotina_automatica: rest.folha_rotina_automatica ?? null,
    prazo_contrato_experiencia: rest.prazo_contrato_experiencia ?? null,
    lancamentos_fixos: rest.lancamentos_fixos ?? null,
    particularidades_cliente: rest.particularidades_cliente ?? null,
    relatorios_admissao: rest.relatorios_admissao ?? null,
    envio_meio: rest.envio_meio ?? null,
    envio_documento: rest.envio_documento ?? null,
    envio_contato: rest.envio_contato ?? null,
    sindicato: rest.sindicato ?? null,
    convencao_aplicavel_nome: rest.convencao_aplicavel_nome ?? null,
    convencao_id: rest.convencao_id ?? null,
    possui_laudos_sst: rest.possui_laudos_sst ?? null,
    empresa_responsavel_sst: rest.empresa_responsavel_sst ?? null,
    data_vencimento_laudo: rest.data_vencimento_laudo ?? null,
    venc_procuracao_rfb: rest.venc_procuracao_rfb ?? null,
    venc_procuracao_det_fgts: rest.venc_procuracao_det_fgts ?? null,
    venc_procuracao_econsignado: rest.venc_procuracao_econsignado ?? null,
    emails_notificacao_det: rest.emails_notificacao_det ?? null,
    inss_nit: rest.inss_nit ?? null,
    inss_codigo_recolhimento: rest.inss_codigo_recolhimento ?? null,
    inss_salario_contribuicao: numToStr(rest.inss_salario_contribuicao),
    inss_aliquota: numToStr(rest.inss_aliquota),
  };
}

type CredInput = NonNullable<ClienteInput['credenciais']>;

async function upsertCredenciais(
  trx: typeof db,
  clienteId: string,
  credenciais: CredInput | undefined,
): Promise<void> {
  if (!credenciais) return;

  const existing = await trx
    .selectFrom('cliente_credenciais')
    .select(['tipo', 'senha_cipher', 'email_senha_cipher'])
    .where('cliente_id', '=', clienteId)
    .execute();
  const prev = new Map(existing.map((e) => [e.tipo, e]));

  // Só cifra/atualiza a senha quando uma nova é informada; caso contrário mantém a existente.
  const resolveCipher = (incoming: string | null | undefined, current: string | null) =>
    incoming ? encrypt(incoming) : current;

  const sd = credenciais.seguro_desemprego;
  if (sd) {
    const cur = prev.get('seguro_desemprego');
    await trx
      .insertInto('cliente_credenciais')
      .values({
        cliente_id: clienteId,
        tipo: 'seguro_desemprego',
        usuario: sd.usuario ?? null,
        senha_cipher: resolveCipher(sd.senha, cur?.senha_cipher ?? null),
        email: sd.email ?? null,
        email_senha_cipher: resolveCipher(sd.email_senha, cur?.email_senha_cipher ?? null),
      })
      .onConflict((oc) =>
        oc.columns(['cliente_id', 'tipo']).doUpdateSet((eb) => ({
          usuario: eb.ref('excluded.usuario'),
          senha_cipher: eb.ref('excluded.senha_cipher'),
          email: eb.ref('excluded.email'),
          email_senha_cipher: eb.ref('excluded.email_senha_cipher'),
        })),
      )
      .execute();
  }

  const ed = credenciais.empregado_domestico;
  if (ed) {
    const cur = prev.get('empregado_domestico');
    await trx
      .insertInto('cliente_credenciais')
      .values({
        cliente_id: clienteId,
        tipo: 'empregado_domestico',
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

export async function listClientes(filters: ClienteFilters) {
  let query = db
    .selectFrom('clientes')
    .leftJoin('convencoes', 'convencoes.id', 'clientes.convencao_id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'clientes.situacao',
      'clientes.responsavel',
      'clientes.regime_tributacao',
      'convencoes.apelido as convencao_apelido',
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

/** Resumo "mascarado" das credenciais — nunca devolve a senha em claro. */
async function getCredenciaisMascaradas(clienteId: string) {
  const rows = await db
    .selectFrom('cliente_credenciais')
    .select(['tipo', 'usuario', 'senha_cipher', 'email', 'email_senha_cipher'])
    .where('cliente_id', '=', clienteId)
    .execute();
  return rows.map((r) => ({
    tipo: r.tipo,
    usuario: r.usuario,
    email: r.email,
    tem_senha: !!r.senha_cipher,
    tem_email_senha: !!r.email_senha_cipher,
  }));
}

export async function getCliente(id: string) {
  const cliente = await db
    .selectFrom('clientes')
    .leftJoin('convencoes', 'convencoes.id', 'clientes.convencao_id')
    .select([...CLIENTE_COLUMNS, 'convencoes.apelido as convencao_apelido'])
    .where('clientes.id', '=', id)
    .executeTakeFirst();
  if (!cliente) return null;
  const credenciais = await getCredenciaisMascaradas(id);
  return { ...cliente, credenciais };
}

/** Revela as credenciais descriptografadas (RNF-02 — endpoint dedicado). */
export async function revelarCredenciais(clienteId: string) {
  const rows = await db
    .selectFrom('cliente_credenciais')
    .select(['tipo', 'usuario', 'senha_cipher', 'email', 'email_senha_cipher'])
    .where('cliente_id', '=', clienteId)
    .execute();
  return rows.map((r) => ({
    tipo: r.tipo,
    usuario: r.usuario,
    email: r.email,
    senha: decrypt(r.senha_cipher),
    email_senha: decrypt(r.email_senha_cipher),
  }));
}

export async function createCliente(input: ClienteInput): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const row = await trx
      .insertInto('clientes')
      .values(mainColumns(input))
      .returning('id')
      .executeTakeFirstOrThrow();
    await upsertCredenciais(trx as typeof db, row.id, input.credenciais);
    return row.id;
  });
}

export async function updateCliente(
  id: string,
  expectedVersion: number,
  input: ClienteInput,
): Promise<number | null> {
  return db.transaction().execute(async (trx) => {
    const updated = await trx
      .updateTable('clientes')
      .set({ ...mainColumns(input), version: expectedVersion + 1 })
      .where('id', '=', id)
      .where('version', '=', expectedVersion)
      .returning('version')
      .executeTakeFirst();
    if (!updated) return null; // conflito de versão
    await upsertCredenciais(trx as typeof db, id, input.credenciais);
    return updated.version;
  });
}

export async function clienteExists(id: string): Promise<boolean> {
  const row = await db.selectFrom('clientes').select('id').where('id', '=', id).executeTakeFirst();
  return !!row;
}

// Lista explícita das colunas do cliente (evita trazer credenciais por engano).
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
    'clientes.possui_folha',
    'clientes.forma_pagamento_salarios',
    'clientes.apura_ponto_escritorio',
    'clientes.realiza_lancamentos',
    'clientes.concede_plano_saude',
    'clientes.plano_operadora',
    'clientes.plano_beneficiarios',
    'clientes.fator_r',
    'clientes.atividade_concomitante',
    'clientes.construcao_civil',
    'clientes.cprb',
    'clientes.observacoes_folha',
    'clientes.prazo_envio_folhas',
    'clientes.folha_rotina_automatica',
    'clientes.prazo_contrato_experiencia',
    'clientes.lancamentos_fixos',
    'clientes.particularidades_cliente',
    'clientes.relatorios_admissao',
    'clientes.envio_meio',
    'clientes.envio_documento',
    'clientes.envio_contato',
    'clientes.sindicato',
    'clientes.convencao_aplicavel_nome',
    'clientes.convencao_id',
    'clientes.possui_laudos_sst',
    'clientes.empresa_responsavel_sst',
    'clientes.data_vencimento_laudo',
    'clientes.venc_procuracao_rfb',
    'clientes.venc_procuracao_det_fgts',
    'clientes.venc_procuracao_econsignado',
    'clientes.emails_notificacao_det',
    'clientes.inss_nit',
    'clientes.inss_codigo_recolhimento',
    'clientes.inss_salario_contribuicao',
    'clientes.inss_aliquota',
    'clientes.version',
    'clientes.created_at',
    'clientes.updated_at',
  ] as const;
