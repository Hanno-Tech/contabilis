import type { NextFunction, Request, Response } from 'express';
import { Unauthorized } from '../lib/errors.js';
import { verifyToken, type SessionUser } from '../lib/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Exige um JWT válido no header Authorization: Bearer <token> (RF-03). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Unauthorized());
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length));
    next();
  } catch {
    next(Unauthorized('Sessão inválida ou expirada'));
  }
}
