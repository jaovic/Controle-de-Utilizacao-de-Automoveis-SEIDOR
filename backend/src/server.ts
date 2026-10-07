import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './infra/prisma';
import { createSmsProvider } from './infra/sms';

const app = createApp({
  prisma,
  smsProvider: createSmsProvider(),
  config: {
    jwtSecret: env.JWT_SECRET,
    accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    cookieSecure: env.COOKIE_SECURE,
    rateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX },
    authRateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX },
    userRateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.USER_RATE_LIMIT_MAX },
    trustProxy: env.TRUST_PROXY,
  },
});

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
  console.log(`Documentação em http://localhost:${env.PORT}/docs`);
  console.log(`SMS: ${env.SMS_PROVIDER === 'console' ? 'modo console (códigos no log)' : 'Twilio'}${env.SMS_PROVIDER === 'twilio' && env.SMS_DEMO_FALLBACK ? ' com modo demonstração' : ''}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
