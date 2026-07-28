import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

/**
 * Rate limit em memória para o login — freia tentativa de força bruta sem
 * adicionar dependência externa (Redis) nem pacote novo.
 *
 * Limitação conhecida: em serverless (Vercel) cada instância tem seu próprio
 * contador, então o teto efetivo é maior do que o configurado. Ainda assim
 * transforma "milhares de tentativas por minuto" em "algumas dezenas", que é o
 * que importa aqui. Se o volume crescer, trocar por um contador no Postgres.
 */
interface Bucket {
  hits: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const JANELA_MS = 15 * 60 * 1000; // 15 minutos
const MAX_TENTATIVAS = 10;

/** Remove buckets expirados para a Map não crescer indefinidamente. */
function limpar(agora: number): void {
  for (const [chave, bucket] of buckets) {
    if (bucket.resetAt <= agora) buckets.delete(chave);
  }
}

function chaveDe(req: Request): string {
  // O IP vem do X-Forwarded-For quando atrás de proxy (trust proxy ligado em app.ts).
  const ip = req.ip ?? 'desconhecido';
  const username = String((req.body as { username?: unknown })?.username ?? '')
    .trim()
    .toLowerCase();
  return `${ip}|${username}`;
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const agora = Date.now();
  if (buckets.size > 5000) limpar(agora);

  const chave = chaveDe(req);
  const bucket = buckets.get(chave);

  if (!bucket || bucket.resetAt <= agora) {
    buckets.set(chave, { hits: 1, resetAt: agora + JANELA_MS });
    return next();
  }

  bucket.hits += 1;
  if (bucket.hits > MAX_TENTATIVAS) {
    const segundos = Math.ceil((bucket.resetAt - agora) / 1000);
    res.setHeader('Retry-After', String(segundos));
    return next(
      new AppError(
        429,
        `Muitas tentativas de login. Tente novamente em ${Math.ceil(segundos / 60)} minuto(s).`,
        'RATE_LIMITED',
      ),
    );
  }
  next();
}

/** Zera o contador de um login bem-sucedido (chamado após autenticar). */
export function resetLoginRateLimit(req: Request): void {
  buckets.delete(chaveDe(req));
}
