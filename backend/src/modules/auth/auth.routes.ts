import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, Unauthorized } from '../../lib/errors.js';
import { signToken } from '../../lib/jwt.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginRateLimit, resetLoginRateLimit } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import * as usuarios from './usuarios.repository.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
});

const trocarSenhaSchema = z.object({
  senha_atual: z.string().min(1, 'Informe a senha atual'),
  nova_senha: z.string().min(10, 'A nova senha precisa ter ao menos 10 caracteres'),
});

export const authRouter = Router();

// RF-01 — login. A mensagem de erro é genérica de propósito: não distingue
// "usuário não existe" de "senha errada" nem de "usuário inativo".
authRouter.post(
  '/login',
  loginRateLimit,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as z.infer<typeof loginSchema>;
    const usuario = await usuarios.findByUsername(username);
    const senhaOk = usuarios.checkPassword(usuario, password);
    if (!usuario || !senhaOk || !usuario.ativo) {
      throw Unauthorized('Usuário ou senha inválidos');
    }
    const session = { id: usuario.id, username: usuario.username, name: usuario.nome };
    resetLoginRateLimit(req);
    await usuarios.marcarAcesso(usuario.id);
    res.json({ token: signToken(session), user: session });
  }),
);

// Usuário da sessão atual
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Troca da própria senha — exige a senha atual.
authRouter.post(
  '/trocar-senha',
  requireAuth,
  validateBody(trocarSenhaSchema),
  asyncHandler(async (req, res) => {
    const { senha_atual, nova_senha } = req.body as z.infer<typeof trocarSenhaSchema>;
    const usuario = await usuarios.findByUsername(req.user!.username);
    if (!usuario || !usuarios.checkPassword(usuario, senha_atual)) {
      throw Unauthorized('Senha atual incorreta');
    }
    await usuarios.trocarSenha(usuario.id, nova_senha);
    res.json({ ok: true });
  }),
);
