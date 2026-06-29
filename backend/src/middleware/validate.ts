import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

/** Valida e sanitiza req.body contra um schema Zod (RNF-05). */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || 'campo'}: ${i.message}`)
        .join('; ');
      return next(new AppError(400, `Dados inválidos — ${detail}`, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    next();
  };
}
