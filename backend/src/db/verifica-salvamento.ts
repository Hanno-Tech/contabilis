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

  /**
   * Cada caso oferece dois valores; usamos o que difere do atual. Sem isso, na
   * segunda execução o valor já estaria gravado, nada mudaria e o teste passaria
   * sem exercitar nada.
   */
  const casos: Array<{ nome: string; campo: string; valores: [string, string]; junto?: Record<string, unknown> }> = [
    { nome: 'procurações — data da DET/FGTS', campo: 'venc_procuracao_det_fgts', valores: ['2031-12-31', '2030-06-15'] },
    {
      nome: 'procurações — situação da RFB',
      campo: 'venc_procuracao_rfb_situacao',
      valores: ['Não se aplica', 'Sem procuração'],
      junto: { venc_procuracao_rfb: null },
    },
    { nome: 'tributárias — fator R', campo: 'fator_r', valores: ['Sim', 'Não'] },
    { nome: 'admissão — concede plano de saúde', campo: 'concede_plano_saude', valores: ['Sim', 'Não'] },
    { nome: 'fechamento — apura ponto', campo: 'apura_ponto_escritorio', valores: ['Sim', 'Não'] },
    { nome: 'fechamento — prazo de envio', campo: 'prazo_envio_folhas', valores: ['1º dia útil', '2º dia útil'] },
    {
      nome: 'SST — situação do laudo',
      campo: 'data_vencimento_laudo_situacao',
      valores: ['Não possui Laudo', 'Desobrigada'],
      junto: { data_vencimento_laudo: null },
    },
    { nome: 'envio — documento', campo: 'envio_documento', valores: ['Folhas e Guias', 'Guias'] },
    { nome: 'contribuintes — NIT', campo: 'inss_nit', valores: ['12345678901', '10987654321'] },
  ];

  let falhas = 0;
  for (const bruto of casos) {
    const atual = await retrato(cliente.id);
    const valorAtual = String((atual as Record<string, unknown>)[bruto.campo] ?? '');
    const novo = valorAtual === bruto.valores[0] ? bruto.valores[1] : bruto.valores[0];
    const caso = {
      nome: bruto.nome,
      alteracao: { [bruto.campo]: novo, ...(bruto.junto ?? {}) },
      esperado: [bruto.campo, ...Object.keys(bruto.junto ?? {})],
    };

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
