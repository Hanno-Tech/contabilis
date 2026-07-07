import { db } from '../../db/index.js';
import type { FieldChange } from '../../db/types.js';
import type { SessionUser } from '../../lib/jwt.js';
import {
  CLIENTE_FOLHA_LABELS,
  CLIENTE_GERAL_LABELS,
  EVENTO_LABELS,
  OCORRENCIA_LABELS,
  PENDENCIA_LABELS,
} from './audit.labels.js';

export type Entidade = 'cliente' | 'ocorrencia' | 'pendencia' | 'evento';
export type Acao = 'criou' | 'editou' | 'excluiu';

/** Normaliza um valor de campo para string comparável (vazio → null). */
function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

/** Diferença campo-a-campo entre dois registros, segundo um mapa de rótulos. */
export function diffRegistro(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [campo, rotulo] of Object.entries(labels)) {
    const de = normalize(before?.[campo]);
    const para = normalize(after[campo]);
    if (de !== para) changes.push({ campo, rotulo, de, para });
  }
  return changes;
}

interface WriteArgs {
  entidade: Entidade;
  entidade_id: string;
  entidade_label: string | null;
  acao: Acao;
  usuario: SessionUser;
  alteracoes: FieldChange[];
}

/** Grava um evento de auditoria. Nunca lança — auditoria não pode quebrar o fluxo. */
export async function writeAudit(args: WriteArgs): Promise<void> {
  try {
    await db
      .insertInto('alteracoes')
      .values({
        entidade: args.entidade,
        entidade_id: args.entidade_id,
        entidade_label: args.entidade_label,
        acao: args.acao,
        usuario_id: args.usuario.id,
        usuario_nome: args.usuario.name,
        alteracoes: JSON.stringify(args.alteracoes),
      })
      .execute();
  } catch (err) {
    console.error('[auditoria] falha ao registrar evento', err);
  }
}

// --------------------------------------------------------------------- Cliente

type CredResumo = Array<{ tipo: string; link?: string | null; usuario: string | null; email: string | null; tem_senha: boolean; tem_email_senha: boolean }>;
type SindicatoResumo = Array<{ sindicato?: string | null; convencao_aplicavel_nome?: string | null; situacao_convencao?: string | null; recolhe_contribuicao?: string | null }>;

interface ClienteSnapshot {
  id: string;
  codigo: number;
  nome: string;
  [key: string]: unknown;
}

interface FichaSnapshot extends ClienteSnapshot {
  folha: Record<string, unknown> | null;
  credenciais?: CredResumo;
  sindicatos?: SindicatoResumo;
}

/** Resumo comparável das credenciais mascaradas (sem expor segredos). */
function credResumo(snap: { credenciais?: CredResumo } | null): string {
  if (!snap?.credenciais) return '';
  return [...snap.credenciais]
    .sort((a, b) => a.tipo.localeCompare(b.tipo))
    .map((c) => `${c.tipo}:${c.link ?? ''}:${c.usuario ?? ''}:${c.email ?? ''}:${c.tem_senha}:${c.tem_email_senha}`)
    .join('|');
}

/** Resumo comparável da lista de sindicatos/convenções. */
function sindicatosResumo(snap: { sindicatos?: SindicatoResumo } | null): string {
  if (!snap?.sindicatos) return '';
  return snap.sindicatos
    .map((s) => `${s.sindicato ?? ''}:${s.convencao_aplicavel_nome ?? ''}:${s.situacao_convencao ?? ''}:${s.recolhe_contribuicao ?? ''}`)
    .join('|');
}

/** Auditoria das informações gerais (tabela `clientes`). */
export async function registrarCliente(
  usuario: SessionUser,
  acao: Acao,
  before: ClienteSnapshot | null,
  after: ClienteSnapshot,
): Promise<void> {
  let alteracoes: FieldChange[] = [];
  if (acao === 'editou') {
    alteracoes = diffRegistro(before, after, CLIENTE_GERAL_LABELS);
    if (alteracoes.length === 0) return; // edição sem mudança real — não registra
  }
  await writeAudit({
    entidade: 'cliente',
    entidade_id: after.id,
    entidade_label: `${after.codigo} — ${after.nome}`,
    acao,
    usuario,
    alteracoes,
  });
}

/** Auditoria dos dados de folha em diante (tabela `cliente_folha`). */
export async function registrarClienteFolha(
  usuario: SessionUser,
  before: FichaSnapshot,
  after: FichaSnapshot,
): Promise<void> {
  const alteracoes = diffRegistro(before.folha, after.folha ?? {}, CLIENTE_FOLHA_LABELS);
  if (sindicatosResumo(before) !== sindicatosResumo(after)) {
    alteracoes.push({
      campo: 'sindicatos',
      rotulo: 'Informações sindicais',
      de: `${before.sindicatos?.length ?? 0} item(ns)`,
      para: `${after.sindicatos?.length ?? 0} item(ns)`,
    });
  }
  // Credenciais sensíveis: registramos só que mudaram, nunca os valores.
  if (credResumo(before) !== credResumo(after)) {
    alteracoes.push({
      campo: 'credenciais',
      rotulo: 'Senhas / credenciais de acesso',
      de: null,
      para: 'atualizadas',
    });
  }
  if (alteracoes.length === 0) return;
  await writeAudit({
    entidade: 'cliente',
    entidade_id: after.id,
    entidade_label: `${after.codigo} — ${after.nome}`,
    acao: 'editou',
    usuario,
    alteracoes,
  });
}

// ------------------------------------------------------------------ Ocorrência

interface OcorrenciaSnapshot {
  id: string;
  data: string;
  cliente_nome: string;
  situacao: string;
  [key: string]: unknown;
}

/** 'YYYY-MM-DD' -> 'DD/MM/AAAA' para o rótulo do evento. */
function formatData(data: string): string {
  const [y, m, d] = data.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : data;
}

export async function registrarOcorrencia(
  usuario: SessionUser,
  acao: Acao,
  before: OcorrenciaSnapshot | null,
  after: OcorrenciaSnapshot | null,
): Promise<void> {
  const snap = after ?? before;
  if (!snap) return;
  let alteracoes: FieldChange[] = [];
  if (acao === 'editou') {
    alteracoes = diffRegistro(before, after!, OCORRENCIA_LABELS);
    if (alteracoes.length === 0) return; // edição sem mudança real — não registra
  }
  await writeAudit({
    entidade: 'ocorrencia',
    entidade_id: snap.id,
    entidade_label: `${snap.cliente_nome} — ${formatData(snap.data)}`,
    acao,
    usuario,
    alteracoes,
  });
}

// ------------------------------------------------------------------ Pendência

interface PendenciaSnapshot {
  id: string;
  data: string;
  cliente_nome: string;
  situacao: string;
  [key: string]: unknown;
}

export async function registrarPendencia(
  usuario: SessionUser,
  acao: Acao,
  before: PendenciaSnapshot | null,
  after: PendenciaSnapshot | null,
): Promise<void> {
  const snap = after ?? before;
  if (!snap) return;
  let alteracoes: FieldChange[] = [];
  if (acao === 'editou') {
    alteracoes = diffRegistro(before, after!, PENDENCIA_LABELS);
    if (alteracoes.length === 0) return; // edição sem mudança real — não registra
  }
  await writeAudit({
    entidade: 'pendencia',
    entidade_id: snap.id,
    entidade_label: `${snap.cliente_nome} — ${formatData(snap.data)}`,
    acao,
    usuario,
    alteracoes,
  });
}

// --------------------------------------------------------------- Evento futuro

interface EventoSnapshot {
  id: string;
  competencia: string;
  cliente_nome: string;
  situacao: string;
  [key: string]: unknown;
}

/** 'YYYY-MM-DD' -> 'MM/AAAA' para o rótulo do evento. */
function formatCompetencia(competencia: string): string {
  const [y, m] = competencia.slice(0, 10).split('-');
  return y && m ? `${m}/${y}` : competencia;
}

export async function registrarEvento(
  usuario: SessionUser,
  acao: Acao,
  before: EventoSnapshot | null,
  after: EventoSnapshot | null,
): Promise<void> {
  const snap = after ?? before;
  if (!snap) return;
  let alteracoes: FieldChange[] = [];
  if (acao === 'editou') {
    alteracoes = diffRegistro(before, after!, EVENTO_LABELS);
    if (alteracoes.length === 0) return; // edição sem mudança real — não registra
  }
  await writeAudit({
    entidade: 'evento',
    entidade_id: snap.id,
    entidade_label: `${snap.cliente_nome} — ${formatCompetencia(snap.competencia)}`,
    acao,
    usuario,
    alteracoes,
  });
}

// ---------------------------------------------------------------------- Listar

export interface AlteracaoFilters {
  entidade?: Entidade;
  entidade_id?: string;
  q?: string;
  limit?: number;
}

export async function listAlteracoes(filters: AlteracaoFilters) {
  let query = db
    .selectFrom('alteracoes')
    .select([
      'id',
      'entidade',
      'entidade_id',
      'entidade_label',
      'acao',
      'usuario_id',
      'usuario_nome',
      'alteracoes',
      'created_at',
    ]);

  if (filters.entidade) query = query.where('entidade', '=', filters.entidade);
  if (filters.entidade_id) query = query.where('entidade_id', '=', filters.entidade_id);
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([eb('entidade_label', 'ilike', term), eb('usuario_nome', 'ilike', term)]),
    );
  }

  return query
    .orderBy('created_at', 'desc')
    .limit(Math.min(filters.limit ?? 200, 500))
    .execute();
}
