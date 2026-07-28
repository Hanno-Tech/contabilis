import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../lib/errors.js';
import { verifyToken, type SessionUser } from '../lib/jwt.js';
import { isActive } from '../modules/auth/usuarios.repository.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Exige um JWT válido no header Authorization: Bearer <token> (RF-03).
 *
 * Além de conferir a assinatura, confirma no banco que o usuário continua
 * ativo — sem isso, desativar alguém só teria efeito quando o token expirasse
 * (até 8h depois). É um SELECT por chave primária, de custo desprezível.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Unauthorized());
  }

  let user: SessionUser;
  try {
    user = verifyToken(header.slice('Bearer '.length));
  } catch {
    return next(Unauthorized('Sessão inválida ou expirada'));
  }

  try {
    if (!(await isActive(user.id))) {
      return next(Unauthorized('Acesso revogado'));
    }
  } catch (err) {
    return next(err as Error);
  }

  req.user = user;
  next();
}
