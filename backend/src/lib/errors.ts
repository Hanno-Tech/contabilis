import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const NotFound = (msg = 'Recurso não encontrado') => new AppError(404, msg, 'NOT_FOUND');
export const BadRequest = (msg: string) => new AppError(400, msg, 'BAD_REQUEST');
export const Unauthorized = (msg = 'Não autenticado') => new AppError(401, msg, 'UNAUTHORIZED');
/** Conflito de edição concorrente (locking otimista — RNF-01). */
export const Conflict = (msg = 'Registro foi alterado por outro usuário') =>
  new AppError(409, msg, 'CONFLICT');

/** Envolve handlers async para encaminhar erros ao middleware de erro. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next);
  };
}
