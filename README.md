# Contabilis — Gestão do Departamento Pessoal

Aplicação web multiusuário que substitui as planilhas do Departamento Pessoal
(cadastro de clientes e convenções coletivas — CCT), eliminando o conflito de
edição concorrente e dando busca, estrutura e proteção às credenciais sensíveis.

Baseado em [`analise-requisitos-dp.md`](./analise-requisitos-dp.md).

## Arquitetura

Monorepo com **backend** e **frontend** totalmente separados, comunicando-se por
uma API REST.

```
contabilis/
├── backend/    API REST  — Node + TypeScript + Express + PostgreSQL
│               Query builder tipado: Kysely | Migrations: node-pg-migrate
├── frontend/   SPA       — React + TypeScript + Vite + Material UI (MUI)
└── docker-compose.yml    PostgreSQL 16
```

### Decisões de projeto que atendem os requisitos

| Requisito | Como é atendido |
|---|---|
| RNF-01 Concorrência sem bloqueio | Locking **otimista** por coluna `version`; edição em registro desatualizado retorna `409 Conflict` em vez de sobrescrever. |
| RNF-02 Segurança de credenciais | Senhas de portais são cifradas com **AES-256-GCM** em repouso e só retornam descriptografadas por endpoint dedicado de "revelar". |
| RNF-03 Busca | Busca textual por nome, CNPJ e código + filtros por situação, responsável e regime. |
| RNF-07 Dado em banco | PostgreSQL — sem arquivo compartilhado. |
| RF-17 / RF-23 Vínculo Cliente↔CCT | Chave estrangeira `clientes.convencao_id`; a partir da CCT lista-se os clientes vinculados. |

## Instalação automática no Windows (do zero, sem Node/Docker)

Para colocar tudo de pé numa máquina Windows **sem nenhum pré-requisito**
(sem Node, sem Docker, sem Git), use o instalador `setup-windows.ps1`. Ele
instala Git, Node.js e PostgreSQL (nativo), clona este repositório, cria o
banco, sobe o backend e o frontend e registra o alias `http://contabilis.local`.

**Opção 1 — uma linha (PowerShell como Administrador):**

```powershell
irm https://raw.githubusercontent.com/Hanno-Tech/contabilis/main/setup-windows.ps1 | iex
```

**Opção 2 — baixar e executar:** baixe `setup-windows.bat` e `setup-windows.ps1`
para a mesma pasta e dê um duplo-clique em `setup-windows.bat`.

Ao final, o app abre sozinho em **http://contabilis.local**. O script é
idempotente — pode rodar de novo a qualquer momento. Parâmetros (pasta de
destino, portas, alias, senhas) podem ser passados ao `.ps1`; veja o cabeçalho
do arquivo.

> O alias `contabilis.local` é uma entrada `127.0.0.1` adicionada ao arquivo
> `hosts` do Windows. O frontend é servido na porta 80 para que a URL fique
> limpa (`http://contabilis.local`, sem `:porta`).

## Pré-requisitos (instalação manual)

- Node.js 20+ (testado com 24)
- Docker + Docker Compose

## Subir o ambiente

### 1. Banco de dados

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # ajuste os segredos se quiser
npm install
npm run migrate up            # cria as tabelas (node-pg-migrate)
npm run seed                  # carrega os dados das planilhas de exemplo
npm run dev                   # API em http://localhost:3333
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # app em http://contabilis.local (porta 80)
```

> Por padrão o Vite serve na **porta 80** para o alias `http://contabilis.local`
> funcionar sem `:porta`. Em desenvolvimento avulso (sem alias / sem admin),
> rode em outra porta: `FRONTEND_PORT=5173 npm run dev` → `http://localhost:5173`.

## Acesso

Login **mockado** (RF-02). Usuários definidos em `backend/src/modules/auth/users.ts`:

| Usuário | Senha |
|---|---|
| `gisele` | `contabilis` |
| `admin` | `contabilis` |

## Estrutura da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Autentica e devolve um JWT |
| GET | `/api/auth/me` | Usuário da sessão |
| GET | `/api/dashboard` | Métricas da tela inicial (KPIs, vencimentos, composição, atividade) |
| GET | `/api/clientes` | Lista com `?q=`, `?situacao=`, `?responsavel=`, `?regime=` |
| POST | `/api/clientes` | Cria cliente |
| GET | `/api/clientes/:id` | Ficha completa |
| PUT | `/api/clientes/:id` | Atualiza (exige `version`) |
| GET | `/api/clientes/:id/credenciais` | Revela credenciais descriptografadas |
| GET | `/api/cct` | Lista convenções |
| POST | `/api/cct` | Cria convenção |
| GET | `/api/cct/:id` | Ficha completa (pisos + regras) |
| PUT | `/api/cct/:id` | Atualiza (exige `version`) |
| GET | `/api/cct/:id/clientes` | Clientes vinculados à convenção |
| GET | `/api/alteracoes` | Trilha de auditoria com filtros (`?entidade=`, `?q=`, `?entidade_id=`) |

## Tela inicial (dashboard)

A rota `/` abre a **Visão geral**: KPIs da carteira, **alertas de vencimento**
(procurações RFB/DET-FGTS/e-Consignado, laudos SST e convenções a expirar —
vencidos + próximos 30/60/90 dias), **composição da carteira** (gráficos por
responsável, regime, situação e top convenções, via Recharts) e um resumo da
**atividade recente** da equipe. Tudo derivado dos dados já existentes,
servido por `GET /api/dashboard`.

## Trilha de alterações (auditoria)

Toda criação e edição de **clientes** e **convenções** é registrada na tabela
`alteracoes`: quem fez, quando, e a lista campo-a-campo do que mudou (de → para).
Senhas de portais nunca são gravadas em claro — registra-se apenas que as
credenciais foram atualizadas. A aba **Alterações** no frontend exibe esse
histórico com busca e filtro por tipo de registro.

Veja `backend/README.md` e `frontend/README.md` para detalhes de cada camada.
