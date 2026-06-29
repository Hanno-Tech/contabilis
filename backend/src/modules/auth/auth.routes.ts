import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, Unauthorized } from '../../lib/errors.js';
import { signToken } from '../../lib/jwt.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { checkPassword, findUser } from './users.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
});

export const authRouter = Router();

// RF-01 — login
authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as z.infer<typeof loginSchema>;
    const user = findUser(username);
    if (!user || !checkPassword(user, password)) {
      throw Unauthorized('Usuário ou senha inválidos');
    }
    const session = { id: user.id, username: user.username, name: user.name };
    res.json({ token: signToken(session), user: session });
  }),
);

// Usuário da sessão atual
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
