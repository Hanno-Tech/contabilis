/**
 * Seeder dos usuários da aplicação.
 *
 * Não há tela de cadastro de usuários: quem entra no sistema é definido aqui e
 * aplicado com `npm run seed:usuarios`. O script é idempotente — rodar de novo
 * atualiza nome/e-mail/situação de quem já existe e cria só os que faltam.
 *
 * Fonte dos dados, na ordem em que são procurados:
 *   1. `--file caminho.json`
 *   2. variável de ambiente `USUARIOS_SEED` (JSON) — usada no Vercel/CI
 *   3. arquivo `usuarios.json` na raiz do backend (fora do git)
 *
 * Formato:
 *   [ { "username": "gisele", "nome": "Gisele", "email": "gisele@contabilis.net",
 *       "senha": "opcional", "ativo": true } ]
 *
 * Quando `senha` é omitida:
 *   - usuário novo   -> gera uma senha forte aleatória e a imprime UMA vez;
 *   - usuário existente -> mantém a senha atual intacta.
 *
 * Flags:
 *   --file <caminho>        lê a lista desse arquivo
 *   --resetar-senhas        regera a senha de todo mundo da lista
 *   --desativar-ausentes    marca ativo=false em quem está no banco mas não na lista
 */
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { closeDb, db } from './index.js';
import { hashPassword } from '../modules/auth/usuarios.repository.js';

const usuarioSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'username precisa de ao menos 3 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'username aceita apenas letras, números, ponto, hífen e underscore'),
  nome: z.string().trim().min(1, 'nome é obrigatório'),
  email: z.string().trim().email('e-mail inválido').optional().nullable(),
  senha: z.string().min(10, 'a senha precisa de ao menos 10 caracteres').optional(),
  ativo: z.boolean().optional(),
});

const listaSchema = z.array(usuarioSchema).min(1, 'a lista de usuários está vazia');

/** Senha aleatória legível: 4 blocos de 4 caracteres, sem os que se confundem (0/O, 1/l/I). */
function gerarSenha(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bloco = () =>
    Array.from({ length: 4 }, () => alfabeto[randomInt(alfabeto.length)]).join('');
  return [bloco(), bloco(), bloco(), bloco()].join('-');
}

function argValor(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const temFlag = (flag: string) => process.argv.includes(flag);

function carregarLista(): z.infer<typeof listaSchema> {
  const arquivo = argValor('--file');
  let bruto: string;
  let origem: string;

  if (arquivo) {
    origem = arquivo;
    bruto = readFileSync(resolve(arquivo), 'utf8');
  } else if (process.env.USUARIOS_SEED) {
    origem = 'variável de ambiente USUARIOS_SEED';
    bruto = process.env.USUARIOS_SEED;
  } else {
    origem = 'usuarios.json';
    try {
      bruto = readFileSync(resolve(process.cwd(), 'usuarios.json'), 'utf8');
    } catch {
      throw new Error(
        'Nenhuma fonte de usuários encontrada. Crie backend/usuarios.json ' +
          '(veja usuarios.example.json), defina USUARIOS_SEED ou use --file <caminho>.',
      );
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    throw new Error(`Conteúdo de ${origem} não é um JSON válido.`);
  }

  const parsed = listaSchema.safeParse(json);
  if (!parsed.success) {
    const detalhe = parsed.error.issues
      .map((i) => `[${i.path.join('.')}] ${i.message}`)
      .join('\n  ');
    throw new Error(`Lista de usuários inválida (${origem}):\n  ${detalhe}`);
  }

  const vistos = new Set<string>();
  for (const u of parsed.data) {
    const chave = u.username.toLowerCase();
    if (vistos.has(chave)) throw new Error(`Username duplicado na lista: ${u.username}`);
    vistos.add(chave);
  }

  console.log(`Fonte: ${origem} — ${parsed.data.length} usuário(s).\n`);
  return parsed.data;
}

async function run() {
  const lista = carregarLista();
  const resetarSenhas = temFlag('--resetar-senhas');
  const senhasGeradas: Array<{ username: string; senha: string }> = [];

  for (const entrada of lista) {
    const existente = await db
      .selectFrom('usuarios')
      .select(['id', 'username'])
      .where(({ eb, fn, val }) =>
        eb(fn('lower', ['username']), '=', val(entrada.username.toLowerCase())),
      )
      .executeTakeFirst();

    // Senha só é definida quando informada, quando o usuário é novo, ou com --resetar-senhas.
    let senha = entrada.senha;
    if (!senha && (!existente || resetarSenhas)) {
      senha = gerarSenha();
      senhasGeradas.push({ username: entrada.username, senha });
    }

    if (existente) {
      await db
        .updateTable('usuarios')
        .set({
          nome: entrada.nome,
          email: entrada.email ?? null,
          ativo: entrada.ativo ?? true,
          ...(senha ? { senha_hash: hashPassword(senha) } : {}),
        })
        .where('id', '=', existente.id)
        .execute();
      console.log(`↻ atualizado: ${entrada.username}${senha ? ' (senha redefinida)' : ''}`);
    } else {
      await db
        .insertInto('usuarios')
        .values({
          username: entrada.username,
          nome: entrada.nome,
          email: entrada.email ?? null,
          senha_hash: hashPassword(senha!),
          ativo: entrada.ativo ?? true,
        })
        .execute();
      console.log(`+ criado: ${entrada.username}`);
    }
  }

  if (temFlag('--desativar-ausentes')) {
    const naLista = lista.map((u) => u.username.toLowerCase());
    const desativados = await db
      .updateTable('usuarios')
      .set({ ativo: false })
      .where(({ eb, fn, val, not }) =>
        not(eb(fn('lower', ['username']), 'in', naLista.map(val))),
      )
      .where('ativo', '=', true)
      .returning('username')
      .execute();
    for (const u of desativados) console.log(`- desativado: ${u.username}`);
  }

  if (senhasGeradas.length) {
    console.log('\n' + '='.repeat(58));
    console.log('SENHAS GERADAS — anote agora, não serão exibidas de novo:');
    console.log('='.repeat(58));
    for (const { username, senha } of senhasGeradas) {
      console.log(`  ${username.padEnd(20)} ${senha}`);
    }
    console.log('='.repeat(58));
    console.log('Peça a cada pessoa que troque a senha no primeiro acesso.');
  }

  console.log('\nPronto.');
}

run()
  .catch((err) => {
    console.error('\nFalha ao semear usuários:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
