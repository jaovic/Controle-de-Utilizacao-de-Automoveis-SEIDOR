import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AccessTokenPayload } from '../../modules/auth/token.service';

export type RateLimitOptions = {
  /** Janela de tempo em milissegundos */
  windowMs: number;
  /** Máximo de requisições por chave (IP ou usuário) dentro da janela */
  max: number;
};

type LimiterSettings = {
  /** Identifica quem está sendo limitado. Padrão: IP da requisição. */
  keyGenerator?: (req: Request, res: Response) => string;
  message?: string;
};

/**
 * Limita a quantidade de requisições por chave (contador em memória, suficiente para uma instância).
 * Ao exceder, responde 429 no mesmo formato de erro do restante da API,
 * com os headers padrão RateLimit-* e Retry-After.
 */
export const createRateLimiter = (
  { windowMs, max }: RateLimitOptions,
  { keyGenerator, message = 'Muitas requisições. Tente novamente em instantes.' }: LimiterSettings = {},
) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({ error: { message, code: 'RATE_LIMITED' } });
    },
  });

/**
 * Limite por usuário autenticado (o `sub` do access token). Deve vir depois de `authenticate`.
 *
 * Complementa o limite por IP: vários usuários atrás do mesmo IP (rede da empresa) não se
 * bloqueiam, e uma mesma conta não escapa do limite trocando de IP. A chave é o usuário,
 * e não a string do token, porque o token muda a cada refresh e zeraria o contador.
 */
export const createUserRateLimiter = (options: RateLimitOptions) =>
  createRateLimiter(options, {
    keyGenerator: (_req, res) => `user:${(res.locals.auth as AccessTokenPayload).userId}`,
    message: 'Muitas requisições para esta conta. Tente novamente em instantes.',
  });
