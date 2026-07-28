# Contabilis — Gestão do Departamento Pessoal

Aplicação web multiusuário que substitui as planilhas do Departamento Pessoal
(cadastro de clientes e sua ficha operacional), eliminando o conflito de
edição concorrente e dando busca, estrutura e proteção às credenciais sensíveis.

Baseado em [`analise-requisitos-dp.md`](./analise-requisitos-dp.md).

## Arquitetura

Monorepo (workspaces npm) com **backend** e **frontend** separados, comunicando-se
por uma API REST em `/api`.

```
contabilis/
├── backend/    API REST  — Node + TypeScript + Express + PostgreSQL
│               Query builder tipado: Kysely | Migrations: runner próprio
├── frontend/   SPA       — React + TypeScript + Vite + Material UI (MUI)
├── api/        Ponto de entrada da API como função serverless no Vercel
├── vercel.json Configuração do deploy (app + API no mesmo domínio)
└── docker-compose.yml    PostgreSQL 16 para desenvolvimento
```

Em produção o app e a API vivem **no mesmo domínio**, então o frontend chama
`/api` em caminho relativo. Em desenvolvimento o Vite faz proxy de `/api` para o
backend local — o comportamento é o mesmo nos dois ambientes e não há CORS.

Em produção: **https://contabilis.vercel.app** — Vercel (app + API) e Neon
(PostgreSQL). Todo push em `main` faz deploy. Detalhes em
**[DEPLOY.md](./DEPLOY.md)**.

### Decisões de projeto que atendem os requisitos

| Requisito | Como é atendido |
|---|---|
| RNF-01 Concorrência sem bloqueio | Locking **otimista** por coluna `version`; edição em registro desatualizado retorna `409 Conflict` em vez de sobrescrever. |
| RNF-02 Segurança de credenciais | Senhas de portais são cifradas com **AES-256-GCM** em repouso e só retornam descriptografadas por endpoint dedicado de "revelar". |
| RNF-03 Busca | Busca textual por nome, CNPJ e código + filtros por situação, responsável e regime. |
| RNF-07 Dado em banco | PostgreSQL — sem arquivo compartilhado. |
| Autenticação | Usuários na tabela `usuarios` com senha em **bcrypt** (12 rounds); JWT de 8h; login limitado a 10 tentativas por 15 min; usuário desativado perde o acesso na hora, mesmo com token válido. |
| Segredos | `JWT_SECRET` e `CREDENTIALS_ENCRYPTION_KEY` são **obrigatórios em produção** — a API se recusa a subir com os valores de exemplo do repositório. |
| Convenção coletiva | Registrada como texto livre na ficha do cliente (nome da convenção, situação e recolhimento de contribuição), sem cadastro separado. |

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

### Desinstalar

Para desfazer tudo o que o instalador fez, rode **`uninstall-windows.bat`**
(duplo-clique). Ele encerra o app, remove o alias do `hosts`, apaga o banco e o
usuário `contabilis` e remove a pasta do projeto. Por segurança ele **pergunta**
antes de desinstalar Node, Git e PostgreSQL (que podem ser usados por outros
projetos). Para remover **tudo** sem perguntar:

```powershell
powershell -ExecutionPolicy Bypass -File uninstall-windows.ps1 -All -Force
```

Para remover só o app e manter os programas: adicione `-KeepPackages`.

## Pré-requisitos (instalação manual)

- Node.js 20+ (testado com 24)
- Docker + Docker Compose

## Subir o ambiente

```bash
# 1. Dependências — um install na raiz cobre backend e frontend (workspaces)
npm install

# 2. Configuração
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Banco de dados
docker compose up -d
npm run db:migrate            # cria as tabelas
npm run seed                  # dados das planilhas de exemplo (opcional)
npm run seed:usuarios         # cria os usuários — veja "Acesso e usuários"

# 4. Aplicação (em dois terminais)
npm run dev:api               # API em http://localhost:3333
npm run dev:app               # app em http://contabilis.local (porta 80)
```

> Por padrão o Vite serve na **porta 80** para o alias `http://contabilis.local`
> funcionar sem `:porta`. Em desenvolvimento avulso (sem alias / sem admin),
> rode em outra porta: `FRONTEND_PORT=5173 npm run dev:app` →
> `http://localhost:5173`.

Cada workspace também roda sozinho (`cd backend && npm run dev`), mas o
`npm install` precisa ser feito na raiz.

## Acesso e usuários

Os usuários ficam na tabela `usuarios` do banco, com a senha guardada apenas
como hash bcrypt. **Não há tela de cadastro de usuários** — quem tem acesso é
definido por um arquivo e aplicado com um script:

```bash
cd backend
cp usuarios.example.json usuarios.json   # edite com as pessoas reais
npm run seed:usuarios                    # cria/atualiza; imprime as senhas geradas
```

O `usuarios.json` **não vai para o git**. Cada entrada aceita
`username`, `nome`, `email`, `senha` (opcional) e `ativo` (opcional):

- sem `senha`, um usuário novo recebe uma senha forte aleatória, exibida **uma
  única vez** no terminal — repasse e peça a troca no primeiro acesso;
- rodar de novo é seguro: atualiza quem já existe e cria só o que falta, sem
  mexer nas senhas já definidas.

Outras formas de informar a lista: `--file <caminho>` ou a variável de ambiente
`USUARIOS_SEED` (JSON), usada no deploy. Flags: `--resetar-senhas` regera a senha
de todos da lista; `--desativar-ausentes` marca `ativo = false` em quem está no
banco mas não na lista.

Para **revogar um acesso**, marque a pessoa como `"ativo": false` e rode o
script de novo: o efeito é imediato, inclusive para sessões já abertas.
Desativar preserva o histórico de quem cadastrou o quê — por isso não se apaga
o registro. Cada pessoa troca a própria senha pelo ícone de cadeado no rodapé
do menu lateral.

## Carga da carteira de clientes

Os clientes vêm da planilha do setor (`FRPes-001 Visão Geral (Setor Pessoal)`),
importada por script. A planilha **não é versionada** — traz senhas de portais
em texto puro.

```bash
cd backend
npm run import:clientes -- --file "../FRPes-001 ... .xlsx" --dry-run   # só relata
npm run import:clientes -- --file "../FRPes-001 ... .xlsx"             # grava
```

Rode sempre o `--dry-run` antes: ele produz o mesmo relatório da importação
real sem tocar no banco.

O importador **limpa a tabela de clientes e recarrega** tudo da planilha. Como
as demais tabelas apontam para `clientes` com `ON DELETE CASCADE`, ocorrências,
pendências e eventos futuros cairiam junto — por isso o script se recusa a rodar
quando existem esses registros, e só prossegue com `--force`.

Decisões de mapeamento (combinadas com o setor):

| Situação na planilha | O que o importador faz |
|---|---|
| Linha sem `CÓDIGO DA EMPRESA` válido (em branco ou `xx`) | Não importa; lista no relatório para cadastro manual |
| Código repetido | Vale a última linha; o relatório aponta quais foram |
| Texto em coluna de data (`Sem Procuração`, `Não se aplica`, `EXPIRADA`) | Grava vazio; o relatório conta cada valor descartado |
| `SALÁRIO DE CONTRIBUIÇÃO` textual (`Um salário mínimo vigente`) | Não importa — a coluna é numérica no banco; relatado |
| `SENHA` / `USUÁRIO` preenchidos | Vão para o cofre de credenciais, cifrados (AES-256-GCM) |

> O cabeçalho é conferido antes de qualquer gravação: se a planilha mudar de
> formato, o script aborta apontando a coluna divergente em vez de importar
> dado trocado.

### Campos que a planilha não cobre

A ficha do sistema tem 16 campos que **não existem** como coluna na planilha
(procurações DET e FGTS separadas, prazo de contrato de experiência,
lançamentos fixos, particularidades, termo de ciência SST, data de vencimento
do laudo, entre outros). Eles ficam vazios após a importação e precisam ser
preenchidos pela equipe no próprio sistema — é por isso que, logo após a carga,
o painel **"empresas com dados incompletos"** acusa toda a carteira.

## Estrutura da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Autentica e devolve um JWT (limitado a 10 tentativas / 15 min) |
| GET | `/api/auth/me` | Usuário da sessão |
| POST | `/api/auth/trocar-senha` | Troca a própria senha (exige a senha atual) |
| GET | `/api/dashboard` | Métricas da tela inicial (KPIs, vencimentos, composição, atividade) |
| GET | `/api/clientes` | Lista com `?q=`, `?situacao=`, `?responsavel=`, `?regime=` |
| POST | `/api/clientes` | Cria cliente |
| GET | `/api/clientes/:id` | Ficha completa |
| PUT | `/api/clientes/:id` | Atualiza (exige `version`) |
| GET | `/api/clientes/:id/credenciais` | Revela credenciais descriptografadas |
| GET | `/api/ocorrencias` | Ocorrências por cliente (CRUD, filtros) |
| GET/POST/PUT/DELETE | `/api/pendencias` | Pendências (data do cadastro automática, quem cadastrou/soluciona, situação) |
| GET/POST/PUT/DELETE | `/api/eventos-futuros` | Eventos futuros a lançar (cliente, competência, colaborador, situação) |
| GET | `/api/relatorios` | Catálogo dos relatórios disponíveis |
| GET | `/api/relatorios/:key` | Dados de um relatório (`{ titulo, colunas, linhas }`) |
| GET | `/api/alteracoes` | Trilha de auditoria com filtros (`?entidade=`, `?q=`, `?entidade_id=`) |

## Tela inicial (dashboard)

A rota `/` abre a **Dashboards**: KPIs da carteira, **alertas de vencimento**
(procurações RFB/DET-FGTS/e-Consignado e laudos SST —
vencidos + próximos 30/60/90 dias), **composição da carteira** (gráficos por
responsável, regime e situação, via Recharts) e um resumo da
**atividade recente** da equipe. Tudo derivado dos dados já existentes,
servido por `GET /api/dashboard`. Inclui ainda **empresas com dados incompletos**
(clique na linha vai direto completar o cadastro) e **eventos futuros a lançar**
cuja competência está próxima ou já chegou.

## Submenus do Setor Pessoal

Além de Informações Gerais e Ocorrências, o Setor Pessoal reúne:

- **Pendências** — serviços que surgem durante o período da folha. Cada pendência
  grava automaticamente a data do dia do cadastro, quem cadastrou, quem vai
  solucionar e a situação (Aberta · Desconsiderada · Resolvida).
- **Eventos futuros** — lançamentos programados (ex.: alteração de salário no fim
  do ano): cliente, competência de lançamento, colaborador, quem lançou e a
  situação (A lançar · Lançado · Cancelado). Aparecem no dashboard quando a
  competência se aproxima.
- **Relatórios** — 7 relatórios (fechamento da folha, clientes por situação,
  procurações vencidas, campos não preenchidos, clientes por regime, pendências
  em aberto e eventos a lançar), cada um com **exportação para Excel (.xlsx)**.

## Trilha de alterações (auditoria)

Toda criação e edição de **clientes**, **ocorrências**, **pendências** e
**eventos futuros** é registrada na tabela
`alteracoes`: quem fez, quando, e a lista campo-a-campo do que mudou (de → para).
Senhas de portais nunca são gravadas em claro — registra-se apenas que as
credenciais foram atualizadas. A aba **Alterações** no frontend exibe esse
histórico com busca e filtro por tipo de registro.

Veja `backend/README.md` e `frontend/README.md` para detalhes de cada camada.
