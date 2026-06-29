import { db } from '../../db/index.js';
import type { FieldChange } from '../../db/types.js';
import type { SessionUser } from '../../lib/jwt.js';
import { CLIENTE_LABELS, CONVENCAO_LABELS } from './audit.labels.js';

export type Entidade = 'cliente' | 'convencao';
export type Acao = 'criou' | 'editou';

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

interface ClienteSnapshot {
  id: string;
  codigo: number;
  nome: string;
  credenciais?: Array<{ tipo: string; usuario: string | null; email: string | null; tem_senha: boolean; tem_email_senha: boolean }>;
  [key: string]: unknown;
}

/** Resumo comparável das credenciais mascaradas (sem expor segredos). */
function credResumo(snap: ClienteSnapshot | null): string {
  if (!snap?.credenciais) return '';
  return [...snap.credenciais]
    .sort((a, b) => a.tipo.localeCompare(b.tipo))
    .map((c) => `${c.tipo}:${c.usuario ?? ''}:${c.email ?? ''}:${c.tem_senha}:${c.tem_email_senha}`)
    .join('|');
}

export async function registrarCliente(
  usuario: SessionUser,
  acao: Acao,
  before: ClienteSnapshot | null,
  after: ClienteSnapshot,
): Promise<void> {
  let alteracoes: FieldChange[] = [];
  if (acao === 'editou') {
    alteracoes = diffRegistro(before, after, CLIENTE_LABELS);
    // Credenciais sensíveis: registramos só que mudaram, nunca os valores.
    if (credResumo(before) !== credResumo(after)) {
      alteracoes.push({
        campo: 'credenciais',
        rotulo: 'Credenciais de acesso',
        de: null,
        para: 'atualizadas',
      });
    }
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

// ------------------------------------------------------------------- Convenção

interface CctSnapshot {
  id: string;
  apelido: string;
  pisos?: Array<{ funcao: string; valor: string | null }>;
  regras?: Array<{ categoria: string; titulo: string | null; conteudo: string }>;
  [key: string]: unknown;
}

function pisosResumo(snap: CctSnapshot | null): string {
  return JSON.stringify(snap?.pisos?.map((p) => [p.funcao, p.valor]) ?? []);
}
function regrasResumo(snap: CctSnapshot | null): string {
  return JSON.stringify(snap?.regras?.map((r) => [r.categoria, r.titulo, r.conteudo]) ?? []);
}

export async function registrarConvencao(
  usuario: SessionUser,
  acao: Acao,
  before: CctSnapshot | null,
  after: CctSnapshot,
): Promise<void> {
  let alteracoes: FieldChange[] = [];
  if (acao === 'editou') {
    alteracoes = diffRegistro(before, after, CONVENCAO_LABELS);
    if (pisosResumo(before) !== pisosResumo(after)) {
      alteracoes.push({
        campo: 'pisos',
        rotulo: 'Pisos salariais',
        de: `${before?.pisos?.length ?? 0} item(ns)`,
        para: `${after.pisos?.length ?? 0} item(ns)`,
      });
    }
    if (regrasResumo(before) !== regrasResumo(after)) {
      alteracoes.push({
        campo: 'regras',
        rotulo: 'Regras / cláusulas',
        de: `${before?.regras?.length ?? 0} item(ns)`,
        para: `${after.regras?.length ?? 0} item(ns)`,
      });
    }
    if (alteracoes.length === 0) return;
  }
  await writeAudit({
    entidade: 'convencao',
    entidade_id: after.id,
    entidade_label: after.apelido,
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
