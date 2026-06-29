# Análise de Requisitos — Sistema de Gestão do Departamento Pessoal

**Versão:** 1.0 (MVP)
**Escopo desta versão:** Departamento Pessoal
**Base de levantamento:** planilhas `Exemplo_visão_geral.xlsx` (cadastro-mestre de clientes) e `CCT.xlsx` (convenção coletiva estruturada)

---

## 1. Contexto e problema

A contabilidade opera hoje sobre planilhas Excel grandes, armazenadas em diretório compartilhado no servidor da empresa. Vários funcionários acessam e editam os mesmos arquivos, o que gera:

- **Conflito de edição e bloqueio de arquivo** — quando uma pessoa está com a planilha aberta, as demais ficam em modo somente-leitura ou sobrescrevem o trabalho umas das outras.
- **Dificuldade de busca** — localizar os dados de um cliente exige rolar planilhas com dezenas de colunas e muitas linhas.
- **Dado crítico em arquivo aberto** — informações sensíveis (incluindo senhas de portais governamentais) ficam em texto puro num arquivo acessível a qualquer pessoa com acesso à pasta.

O objetivo é centralizar essas planilhas em um software web, eliminando o conflito de concorrência e dando busca, controle de acesso e estrutura aos dados. O recorte inicial é o **Departamento Pessoal**, representado pelas duas planilhas analisadas.

## 2. Objetivo do produto

Substituir as planilhas do Departamento Pessoal por uma aplicação web multiusuário que permita consultar, cadastrar e atualizar os dados dos clientes e das convenções coletivas de forma concorrente e segura, mantendo (e melhorando) tudo o que as planilhas representam hoje.

## 3. Escopo

### 3.1 Dentro do escopo (MVP)

- Autenticação por tela de login (usuários **mockados**, sem fluxo de cadastro nesta fase).
- Módulo **Clientes** — equivalente à planilha de visão geral, com todos os blocos de informação.
- Módulo **Convenções Coletivas (CCT)** — equivalente à planilha de CCT, como base de referência reutilizável.
- Vínculo **Cliente → Convenção aplicável**.
- Busca e filtros sobre clientes.
- Acesso concorrente sem bloqueio de arquivo.

### 3.2 Fora do escopo (por enquanto)

- Cadastro, gestão de papéis e permissões granulares de usuários (login é mockado).
- Demais setores da contabilidade (fiscal, contábil, societário).
- Integrações com sistemas externos (Domínio, e-Social, Gestta, bancos).
- Cálculo de folha, geração de guias ou relatórios automáticos.
- Importação automática das planilhas legadas (pode entrar como item futuro de migração).

## 4. Usuários

| Perfil | Descrição | Necessidade principal |
|---|---|---|
| Funcionário do DP | Analista/responsável que consulta e mantém os dados (ex.: "Gisele", o "Responsável" da planilha) | Encontrar e editar dados de um cliente rapidamente, sem conflito |
| Colaborador do escritório | Outros funcionários que apenas consultam | Localizar uma informação específica de um cliente |

Nesta fase todos entram por um login mockado, sem diferenciação de permissão.

## 5. Modelo de domínio (entidades)

As planilhas revelam três entidades centrais e uma relação importante entre elas.

```
Convenção (CCT) 1 ───── N Cliente N ───── 1 Sindicato
```

Uma mesma convenção aplica-se a vários clientes. Hoje esse vínculo é manual e replicado em cada arquivo; no sistema vira uma relação real, de modo que atualizar a CCT reflete em todos os clientes ligados a ela.

### 5.1 Cliente (a partir de `Exemplo_visão_geral.xlsx`)

Agrupado nos mesmos blocos da planilha:

- **Informações gerais:** código da empresa, nome, CNPJ, tipo de cliente, regime de tributação, situação, data do evento da situação, responsável.
- **Folha de pagamento:** possui folha?, forma de pagamento dos salários, apura o ponto pelo escritório?, realiza lançamentos?, plano de saúde (concede?, operadora, beneficiários), fator "R"?, atividade concomitante?, construção civil?, CPRB?, observações importantes (texto livre), prazo para envio das folhas.
- **Rotinas automáticas:** calcula e gera a folha via rotina automática?
- **Admissão:** prazo do contrato de experiência, lançamentos fixos, particularidades do cliente, relatórios gerados na admissão (texto livre extenso).
- **Envio de documentos:** meio, documento, contato.
- **Sindicato e convenção:** sindicato ao qual está sujeito, convenção aplicável (vínculo com a entidade CCT).
- **Saúde e segurança do trabalho (SST):** possui laudos?, empresa responsável pela SST, **data de vencimento do laudo**.
- **Procurações:** **vencimento** RFB, **vencimento** DET e FGTS Digital, **vencimento** e-Consignado, e-mails que recebem a notificação do DET.
- **Credenciais — Seguro Desemprego:** usuário, senha, e-mail do cliente, senha do e-mail. *(dado sensível)*
- **Guia INSS autônomo/facultativo:** NIT, código de recolhimento, salário de contribuição, alíquota.
- **Empregado doméstico:** usuário, senha. *(dado sensível)*

### 5.2 Convenção Coletiva — CCT (a partir de `CCT.xlsx`)

- **Identificação:** sindicato patronal, sindicato laboral, apelido, data de vigência (início/fim), data de expiração, situação (ex.: Vigente).
- **Pisos salariais:** lista de função → valor (motorista de viagem, coleta e entrega, motoboy, ajudantes, office-boys/limpeza).
- **Jornada e horas extras:** percentual dias normais, percentual domingos/feriados, adicional noturno, observações.
- **Regras textuais:** banco de horas, aviso prévio, controle de jornada, estabilidades, faltas justificadas, atestados, contribuições sindicais, diárias e demais situações, assistência nas rescisões, contatos do sindicato.

A CCT é majoritariamente um documento de **referência**: poucos campos numéricos (pisos, percentuais, vencimentos) e muitos blocos de regras em texto.

### 5.3 Observações estruturais relevantes

1. **Vencimentos espalhados** — procurações (RFB, DET/FGTS, e-Consignado), laudo de SST e vigência da CCT são todos campos de data com prazo. Isso sugere, já no roadmap, um mecanismo de alerta de vencimento (ver requisito futuro RF-ALERTA).
2. **Campos de texto livre críticos** — "particularidades do cliente", "relatórios gerados na admissão" e "observações importantes sobre a folha" contêm o procedimento operacional do cliente. Devem ser tratados como conteúdo de primeira classe (campo amplo, pesquisável), não como observação secundária.
3. **Dados sensíveis** — senhas de portais (Seguro Desemprego, e-mail do cliente, empregado doméstico) hoje ficam em texto puro. Tratar com cuidado especial de segurança no novo sistema.

## 6. Requisitos funcionais

### Autenticação
- **RF-01** — O sistema deve apresentar tela de login para acesso.
- **RF-02** — A autenticação usa uma lista de usuários **mockada** (definida em código/configuração), sem tela de cadastro nesta fase.
- **RF-03** — Sessões inválidas/expiradas devem redirecionar para o login.

### Módulo Clientes
- **RF-10** — Listar clientes com as colunas-chave (código, nome, CNPJ, situação, responsável).
- **RF-11** — Buscar cliente por nome, CNPJ ou código.
- **RF-12** — Filtrar a lista por situação, responsável e regime de tributação.
- **RF-13** — Visualizar a ficha completa de um cliente, organizada nos blocos da seção 5.1.
- **RF-14** — Cadastrar um novo cliente.
- **RF-15** — Editar os dados de um cliente.
- **RF-16** — Permitir que vários usuários consultem o mesmo cliente simultaneamente sem bloqueio.
- **RF-17** — Vincular um cliente a uma convenção (CCT) existente.

### Módulo Convenções (CCT)
- **RF-20** — Listar convenções com identificação e situação (vigente/expirada).
- **RF-21** — Visualizar a ficha completa de uma CCT (pisos, percentuais e regras textuais).
- **RF-22** — Cadastrar e editar uma convenção.
- **RF-23** — A partir de uma CCT, visualizar quais clientes estão vinculados a ela.

### Itens previstos para evolução (não obrigatórios no MVP)
- **RF-ALERTA** — Sinalizar vencimentos próximos de procurações, laudos de SST e vigência de CCT.
- **RF-AUDIT** — Registrar quem alterou o quê e quando.
- **RF-IMPORT** — Importar os dados das planilhas legadas para carga inicial.

## 7. Requisitos não-funcionais

- **RNF-01 (Concorrência)** — O sistema deve suportar múltiplos usuários lendo e editando dados ao mesmo tempo, **sem bloqueio de arquivo** — este é o problema central a ser resolvido. Definir estratégia para edições simultâneas do mesmo registro (ex.: última escrita vence, ou aviso de conflito).
- **RNF-02 (Segurança de credenciais)** — Senhas de portais de clientes não podem ficar em texto puro acessível; devem ser armazenadas de forma protegida e exibidas apenas sob controle de acesso.
- **RNF-03 (Busca)** — A localização de um cliente deve ser substancialmente mais rápida que rolar a planilha; busca por texto deve cobrir nome, CNPJ e código.
- **RNF-04 (Usabilidade)** — A ficha do cliente deve preservar o agrupamento mental que a equipe já conhece das planilhas, para reduzir a curva de adaptação.
- **RNF-05 (Integridade)** — Campos de data, CNPJ e valores monetários devem ter validação de formato.
- **RNF-06 (Web)** — Aplicação acessível por navegador na rede da empresa, sem instalação por estação.
- **RNF-07 (Disponibilidade dos dados)** — A centralização não pode reintroduzir um ponto único de "arquivo travado"; o dado deve ficar em banco de dados, não em arquivo compartilhado.

## 8. Recorte do MVP

Para "entregar valor agora", a fatia mínima que já substitui a planilha de visão geral é:

1. Login mockado (RF-01 a RF-03).
2. CRUD e ficha completa de Clientes (RF-10 a RF-17).
3. CRUD e ficha de CCT, com vínculo ao cliente (RF-20 a RF-23).
4. Concorrência sem bloqueio (RNF-01) e armazenamento em banco (RNF-07).
5. Tratamento mínimo de segurança para as credenciais (RNF-02).

Alertas de vencimento, auditoria e importação ficam para iterações seguintes.

## 9. Riscos e questões em aberto

- **Edição simultânea do mesmo registro** — definir a política (última escrita vence vs. trava otimista com aviso). Impacta diretamente o problema que motivou o projeto.
- **Como tratar as senhas** — decidir o nível de proteção aceitável para esta fase, dado que login ainda é mockado e não há papéis de acesso.
- **Texto livre vs. campos estruturados** — alguns blocos da CCT e do cliente são procedimentos longos. Decidir o que vira campo estruturado e o que permanece como texto rico.
- **Carga inicial** — como popular o sistema com a base atual das planilhas (digitação manual vs. importação).
- **Datas como número de série** — na planilha alguns vencimentos aparecem como serial do Excel (ex.: 47421); na migração será necessário converter para data real.
