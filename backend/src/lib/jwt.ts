import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): SessionUser {
  const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & SessionUser;
  return { id: decoded.id, username: decoded.username, name: decoded.name };
}
