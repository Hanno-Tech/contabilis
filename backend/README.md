# Backend — Contabilis API

API REST em Node + TypeScript + Express, sobre PostgreSQL.

- **Query builder tipado:** [Kysely](https://kysely.dev) (sem ORM/Prisma)
- **Migrations:** [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
- **Validação:** Zod
- **Auth:** JWT (usuários mockados)
- **Credenciais sensíveis:** AES-256-GCM

## Camadas

```
src/
├── config/env.ts            Variáveis de ambiente validadas
├── db/
│   ├── index.ts             Pool pg + instância Kysely
│   ├── types.ts             Tipos do esquema (sincronizados com as migrations)
│   └── seed.ts              Carga inicial a partir das planilhas
├── lib/                     crypto (AES-GCM), errors, jwt
├── middleware/              auth, validate (zod), error-handler
├── modules/
│   ├── auth/                login mockado + /me
│   ├── clientes/            schema · repository · routes
│   └── cct/                 schema · repository · routes
├── routes.ts                Agregador /api
├── app.ts                   App Express
└── server.ts                Bootstrap + shutdown gracioso
migrations/                  node-pg-migrate (JS/ESM, SQL puro via pgm.sql)
```

Cada módulo segue **schema (Zod) → repository (Kysely) → routes (Express)**, sem
camada de ORM. Isso mantém o SQL explícito e tipado.

## Scripts

```bash
npm run dev          # desenvolvimento com reload (tsx watch)
npm run build        # compila para dist/
npm start            # roda dist/server.js
npm run typecheck    # tsc --noEmit
npm run migrate up   # aplica migrations
npm run migrate down # reverte a última migration
npm run seed         # popula com os dados das planilhas
```

> `npm run migrate` repassa os argumentos ao node-pg-migrate (`up`, `down`,
> `create nome-da-migration`, etc.) e lê `DATABASE_URL` do `.env`.

## Concorrência (RNF-01)

`clientes` e `convencoes` têm coluna `version`. Toda atualização envia a versão
carregada; o `UPDATE ... WHERE version = $esperada` só afeta a linha se ninguém
a alterou nesse meio tempo. Se afetar 0 linhas, a API responde **409 Conflict** —
nada é sobrescrito silenciosamente.

## Segurança de credenciais (RNF-02)

Senhas de portais ficam isoladas em `cliente_credenciais`, cifradas com
AES-256-GCM (`lib/crypto.ts`). A ficha normal do cliente devolve apenas
`tem_senha: boolean`; o valor em claro só sai por `GET /clientes/:id/credenciais`.
