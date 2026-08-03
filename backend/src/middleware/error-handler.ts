import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code ?? 'ERROR', message: err.message } });
    return;
  }
  const pgErr = err as { code?: string; constraint?: string };

  // Violação de unicidade do Postgres (ex.: código de cliente duplicado).
  if (pgErr?.code === '23505') {
    res.status(409).json({
      error: { code: 'UNIQUE_VIOLATION', message: 'Já existe um registro com esse valor único.' },
    });
    return;
  }

  // 22P02 = invalid_text_representation. Acontece quando um id de rota não é um
  // UUID válido (`/api/clientes/foo`): é entrada malformada, não falha do
  // servidor, e antes disto virava um 500 que poluía os logs.
  if (pgErr?.code === '22P02') {
    res.status(400).json({
      error: { code: 'INVALID_ID', message: 'Identificador inválido.' },
    });
    return;
  }
  console.error('[erro não tratado]', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erro interno do servidor' } });
}
