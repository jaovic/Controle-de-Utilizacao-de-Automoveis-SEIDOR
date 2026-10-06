import type { RateLimitOptions } from '../shared/middlewares/rateLimiter';

/** Configuração da aplicação, montada a partir do env em server.ts (ou direto nos testes). */
export type AppConfig = {
  jwtSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
  cookieSecure: boolean;
  rateLimit: RateLimitOptions;
  authRateLimit: RateLimitOptions;
  /** Quantidade de proxies confiáveis à frente da API (ex.: Railway + Vercel = 2), para obter o IP real */
  trustProxy: number;
};

export const defaultAppConfig: AppConfig = {
  jwtSecret: 'test-secret-with-at-least-32-characters!!',
  accessTokenTtlMinutes: 15,
  refreshTokenTtlDays: 7,
  cookieSecure: false,
  rateLimit: { windowMs: 60_000, max: 100 },
  authRateLimit: { windowMs: 60_000, max: 10 },
  trustProxy: 0,
};
