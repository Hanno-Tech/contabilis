# Frontend — Contabilis

SPA em React + TypeScript + Vite, com Material UI (MUI).

- **Roteamento:** React Router
- **Estado de servidor / cache:** TanStack Query
- **HTTP:** Axios (com injeção de JWT e tratamento de 401/409)

## Estrutura

```
src/
├── api/
│   ├── client.ts        Axios + interceptors (token, 401 -> login)
│   └── resources.ts     Funções de chamada da API (auth, clientes, cct)
├── auth/
│   ├── AuthContext.tsx  Sessão (login, logout, /me)
│   └── ProtectedRoute   Guarda de rotas autenticadas
├── components/
│   ├── Layout.tsx       AppBar + navegação
│   └── ui.tsx           SectionCard, ReadField, chips, formatadores
├── pages/
│   ├── LoginPage
│   ├── ClientesListPage / ClienteDetailPage / ClienteFormPage
│   └── CctListPage / CctDetailPage / CctFormPage
├── App.tsx              Rotas
├── main.tsx             Bootstrap (tema, query client, router)
└── theme.ts             Tema MUI (pt-BR)
```

## Scripts

```bash
npm run dev        # servidor de desenvolvimento (porta 5173)
npm run build      # typecheck + build de produção
npm run preview    # pré-visualiza o build
npm run typecheck  # tsc --noEmit
```

## Destaques de UX ligados aos requisitos

- **Busca e filtros** (RF-11/12) na lista de clientes, com debounce natural do React Query.
- **Ficha em blocos** (RF-13 / RNF-04) preservando o agrupamento das planilhas.
- **Credenciais sensíveis** (RNF-02) ficam mascaradas; um botão "Revelar" busca os
  valores em claro sob demanda no endpoint dedicado, com botão de copiar.
- **Conflito de edição** (RNF-01): ao salvar sobre um registro alterado por outra
  pessoa, a tela mostra um aviso em vez de sobrescrever.
- **Vínculo Cliente ↔ CCT** (RF-17): seletor de convenção no formulário do cliente;
  a ficha da CCT lista os clientes vinculados (RF-23).
