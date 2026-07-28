# Deploy — Vercel + Neon

O sistema sobe como **um único projeto no Vercel**: o app (build estático do
Vite) e a API (Express como função serverless) no mesmo domínio, com o banco
PostgreSQL no **Neon**.

```
https://<projeto>.vercel.app/          → frontend/dist (arquivos estáticos)
https://<projeto>.vercel.app/api/...   → api/[...path].ts → app Express
                                          └── Neon (PostgreSQL)
```

Como app e API compartilham o domínio, o frontend chama `/api` em caminho
relativo e **não há CORS** — nem em produção, nem em desenvolvimento (o Vite
faz proxy de `/api` para o backend local).

## Como as peças se encaixam

| Arquivo | Papel |
|---|---|
| `package.json` (raiz) | Workspaces npm — um `npm install` cobre backend e frontend, e a função serverless enxerga as dependências do backend. |
| `api/[...path].ts` | Rota catch-all: entrega tudo que chega em `/api/...` ao mesmo `createApp()` usado em desenvolvimento. |
| `vercel.json` | Build do frontend, saída estática, fallback de SPA e cabeçalhos de segurança. |
| `backend/src/db/index.ts` | Pool enxuto (3 conexões por instância) e TLS obrigatório fora de localhost. |

---

## 1. Banco no Neon

1. Crie um projeto em [neon.tech](https://neon.tech) — região **AWS São Paulo
   (sa-east-1)** para ficar perto dos usuários.
2. Nome do banco: `contabilis`.
3. Na tela de conexão copie **as duas** connection strings:
   - **Pooled** (host termina em `-pooler`) → usada pela aplicação;
   - **Direct** (sem `-pooler`) → usada para rodar migrations.

> Por que duas: cada invocação da função serverless pode abrir seu próprio pool,
> e o pooler do Neon é quem absorve isso. Já as migrations executam DDL, que se
> comporta melhor na conexão direta.

### Rodar as migrations

Da sua máquina, apontando para o Neon (use a connection string **direct**):

```bash
cd backend
DATABASE_URL='postgresql://...neon.tech/contabilis?sslmode=require' npm run db:migrate
```

### Criar os usuários

```bash
cd backend
cp usuarios.example.json usuarios.json     # edite com as pessoas reais
DATABASE_URL='postgresql://...neon.tech/contabilis?sslmode=require' npm run seed:usuarios
```

Anote as senhas geradas — elas aparecem **uma única vez**. Cada pessoa troca a
sua no primeiro acesso, pelo ícone de cadeado no rodapé do menu lateral.

> **Não rode `npm run seed`** contra o Neon: ele carrega os dois clientes de
> exemplo das planilhas de demonstração. Os dados reais entram pelo importador
> da planilha, abaixo.

### Importar a carteira de clientes

```bash
cd backend
# 1) sempre simule primeiro — mesmo relatório, sem gravar
DATABASE_URL='postgresql://...neon.tech/contabilis?sslmode=require' \
  npm run import:clientes -- --file "../FRPes-001 ... .xlsx" --dry-run

# 2) importe
DATABASE_URL='postgresql://...neon.tech/contabilis?sslmode=require' \
  npm run import:clientes -- --file "../FRPes-001 ... .xlsx"
```

Leia o relatório final: ele lista as linhas não importadas (sem código válido),
os códigos repetidos e os valores descartados por não caberem no tipo da coluna.
Detalhes do mapeamento no [README](./README.md#carga-da-carteira-de-clientes).

> A planilha contém as senhas dos portais dos clientes em texto puro. Ela é
> ignorada pelo git (`.gitignore`) e não deve ser enviada para o servidor —
> a importação roda da sua máquina, apontando para o Neon.

---

## 2. Segredos de produção

Gere valores próprios — os do `.env.example` estão neste repositório e são
públicos. A API **se recusa a subir** em produção com eles:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('CREDENTIALS_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ **A `CREDENTIALS_ENCRYPTION_KEY` é definitiva.** É ela que cifra as senhas
> dos portais dos clientes. Trocá-la depois torna ilegível tudo o que já foi
> gravado. Guarde-a em um cofre de senhas antes de continuar.

---

## 3. Projeto no Vercel

1. **Add New → Project** e importe o repositório do GitHub.
2. **Root Directory**: deixe na raiz (`./`). O `vercel.json` já define build,
   saída e rotas — não altere os campos de build na interface.
3. Em **Environment Variables**, adicione para *Production* (e *Preview*, se for
   usar):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | connection string **pooled** do Neon (`...-pooler...?sslmode=require`) |
   | `JWT_SECRET` | o valor gerado acima |
   | `CREDENTIALS_ENCRYPTION_KEY` | o valor gerado acima |
   | `NODE_ENV` | `production` |

   Não defina `VITE_API_URL` — vazio faz o app usar `/api` na mesma origem, que
   é o que queremos. `CORS_ORIGIN` também é dispensável no deploy único.

4. **Deploy**.

### Conferir se subiu

```bash
curl https://<projeto>.vercel.app/api/health          # {"status":"ok"}
curl -X POST https://<projeto>.vercel.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"usuario","password":"senha"}'
```

Se a API responder 500 no primeiro acesso, veja **Logs** no painel do Vercel: a
causa quase sempre é variável de ambiente faltando ou `DATABASE_URL` apontando
para a connection string errada.

---

## 4. Depois do deploy

- **Domínio próprio**: Vercel → Settings → Domains. Não exige mudança no código.
- **Novo usuário / revogar acesso**: edite `backend/usuarios.json` e rode
  `npm run seed:usuarios` com o `DATABASE_URL` do Neon. Marcar `"ativo": false`
  derruba a sessão da pessoa na hora, mesmo com token válido.
- **Backup**: o Neon mantém *point-in-time restore* no plano gratuito (7 dias).
  Para um dump manual:
  `pg_dump 'postgresql://...neon.tech/contabilis?sslmode=require' > backup.sql`
- **Novas migrations**: rode `npm run db:migrate` contra o Neon **antes** de
  fazer o deploy do código que depende delas.

## Desenvolvimento local continua igual

```bash
npm install            # na raiz — workspaces cobrem backend e frontend
docker compose up -d   # PostgreSQL
npm run db:migrate
npm run dev:api        # API em :3333
npm run dev:app        # app em :80 (ou FRONTEND_PORT=5173)
```
