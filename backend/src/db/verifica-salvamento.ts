/**
 * Prova que salvar a ficha altera SOMENTE o campo mexido.
 *
 * Tira um retrato da linha de `cliente_folha`, faz um PUT como o formulário
 * faria (payload completo, com um único valor diferente) e compara coluna a
 * coluna. Qualquer diferença além da esperada e da `version` é regressão.
 *
 * Existe por causa de um bug real: o UPDATE era de linha inteira e convertia
 * "campo ausente do payload" em NULL, então salvar qualquer campo apagava toda
 * coluna que o formulário não desenhasse. Rode depois de mexer no formulário,
 * no schema ou em `folhaColumns`.
 *
 * Uso (com a API de pé e o banco de desenvolvimento):
 *   cd backend && npm run verifica:salvamento
 *
 * ⚠️ Grava de verdade no banco apontado por DATABASE_URL — use em
 * desenvolvimento, nunca contra produção.
 */
import 'dotenv/config';
import { closeDb, db } from './index.js';

const API = process.env.API_URL ?? 'http://localhost:3333/api';
const USUARIO = process.env.TESTE_USUARIO ?? 'gisele';
const SENHA = process.env.TESTE_SENHA ?? 'senha-de-teste-local';

async function login(): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USUARIO, password: SENHA }),
  });
  if (!r.ok) throw new Error(`login falhou: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { token: string }).token;
}

const retrato = (id: string) =>
  db.selectFrom('cliente_folha').selectAll().where('cliente_id', '=', id).executeTakeFirstOrThrow();

function diferencas(antes: Record<string, unknown>, depois: Record<string, unknown>) {
  const out: Array<{ coluna: string; de: unknown; para: unknown }> = [];
  for (const col of Object.keys(antes)) {
    const a = antes[col] instanceof Date ? (antes[col] as Date).toISOString() : antes[col];
    const d = depois[col] instanceof Date ? (depois[col] as Date).toISOString() : depois[col];
    if (String(a) !== String(d)) out.push({ coluna: col, de: a, para: d });
  }
  return out;
}

/** Monta o payload como o formulário: manda a ficha inteira de volta. */
function payloadDaFicha(ficha: Record<string, unknown>, alteracao: Record<string, unknown>) {
  const folha = ficha.folha as Record<string, unknown>;
  const campos: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(folha)) {
    if (k === 'version') continue;
    campos[k] = v === '' ? null : v;
  }
  return {
    ...campos,
    ...alteracao,
    sindicatos: ficha.sindicatos,
    version: folha.version,
  };
}

async function run() {
  const token = await login();
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const cliente = await db
    .selectFrom('clientes')
    .innerJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select(['clientes.id', 'clientes.nome', 'clientes.codigo'])
    .where('cliente_folha.prazo_envio_folhas', 'is not', null)
    .where('cliente_folha.venc_procuracao_det_fgts', 'is not', null)
    .limit(1)
    .executeTakeFirstOrThrow();

  console.log(`cliente de teste: ${cliente.codigo} ${cliente.nome}\n`);

  const casos: Array<{ nome: string; alteracao: Record<string, unknown>; esperado: string[] }> = [
    {
      nome: 'data da procuração DET/FGTS',
      alteracao: { venc_procuracao_det_fgts: '2031-12-31' },
      esperado: ['venc_procuracao_det_fgts'],
    },
    {
      nome: 'situação da procuração RFB',
      alteracao: { venc_procuracao_rfb_situacao: 'Não se aplica', venc_procuracao_rfb: null },
      esperado: ['venc_procuracao_rfb_situacao', 'venc_procuracao_rfb'],
    },
    {
      nome: 'tributárias — fator R',
      alteracao: { fator_r: 'Sim' },
      esperado: ['fator_r'],
    },
    {
      nome: 'admissão — concede plano de saúde',
      alteracao: { concede_plano_saude: 'Sim' },
      esperado: ['concede_plano_saude'],
    },
    {
      nome: 'fechamento — apura ponto',
      alteracao: { apura_ponto_escritorio: 'Sim' },
      esperado: ['apura_ponto_escritorio'],
    },
    {
      nome: 'SST — situação do laudo',
      alteracao: { data_vencimento_laudo_situacao: 'Não possui Laudo', data_vencimento_laudo: null },
      esperado: ['data_vencimento_laudo_situacao', 'data_vencimento_laudo'],
    },
    {
      nome: 'envio — documento',
      alteracao: { envio_documento: 'Folhas e Guias' },
      esperado: ['envio_documento'],
    },
    {
      nome: 'contribuintes — NIT',
      alteracao: { inss_nit: '12345678901' },
      esperado: ['inss_nit'],
    },
  ];

  let falhas = 0;
  for (const caso of casos) {
    const antes = await retrato(cliente.id);
    const ficha = (await (await fetch(`${API}/clientes/${cliente.id}/ficha`, { headers: auth })).json()) as Record<string, unknown>;

    const resp = await fetch(`${API}/clientes/${cliente.id}/folha`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify(payloadDaFicha(ficha, caso.alteracao)),
    });
    if (!resp.ok) {
      console.log(`✖ ${caso.nome}: PUT ${resp.status} ${await resp.text()}`);
      falhas++;
      continue;
    }

    const depois = await retrato(cliente.id);
    const difs = diferencas(
      antes as unknown as Record<string, unknown>,
      depois as unknown as Record<string, unknown>,
    ).filter((d) => d.coluna !== 'version' && d.coluna !== 'updated_at');

    const inesperadas = difs.filter((d) => !caso.esperado.includes(d.coluna));
    const naoAplicadas = caso.esperado.filter(
      (c) => !difs.some((d) => d.coluna === c) && String(antes[c as keyof typeof antes]) !== String(caso.alteracao[c]),
    );

    if (inesperadas.length === 0 && naoAplicadas.length === 0) {
      console.log(`✔ ${caso.nome}: só ${difs.map((d) => d.coluna).join(', ') || '(nada — valor já era esse)'}`);
    } else {
      falhas++;
      console.log(`✖ ${caso.nome}`);
      for (const d of inesperadas) {
        console.log(`    ALTEROU SEM PRECISAR: ${d.coluna}: ${JSON.stringify(d.de)} -> ${JSON.stringify(d.para)}`);
      }
      for (const c of naoAplicadas) console.log(`    NÃO SALVOU: ${c}`);
    }
  }

  console.log(falhas ? `\n${falhas} caso(s) com problema.` : '\nTodos os casos passaram.');
  process.exitCode = falhas ? 1 : 0;
}

run()
  .catch((e) => {
    console.error('✖', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
