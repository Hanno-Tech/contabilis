/**
 * Ponto de entrada da API no Vercel.
 *
 * O arquivo é uma rota catch-all: tudo que chega em `/api/...` cai aqui com a
 * URL original preservada, então o app Express (que monta suas rotas sob
 * `/api`) funciona sem adaptação — o mesmo `createApp()` usado por
 * `backend/src/server.ts` em desenvolvimento.
 *
 * Um app Express é, por definição, um handler `(req, res)`, que é exatamente o
 * que o runtime Node do Vercel espera como export default.
 */
import { createApp } from '../backend/src/app.js';

// Criado fora do handler: instâncias reaproveitadas entre invocações pulam
// essa etapa (e o pool do Postgres junto).
const app = createApp();

export default app;
