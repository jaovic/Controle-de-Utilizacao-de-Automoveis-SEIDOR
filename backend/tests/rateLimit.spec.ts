import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app';
import { type AppConfig, defaultAppConfig } from '../src/config/appConfig';
import { TokenService } from '../src/modules/auth/token.service';

const appWith = (overrides: Partial<AppConfig>) =>
  createApp({ prisma: {} as PrismaClient, config: { ...defaultAppConfig, ...overrides } });

describe('Rate limit', () => {
  it('responde 429 ao exceder o limite de requisições por IP', async () => {
    const app = appWith({ rateLimit: { windowMs: 60_000, max: 2 } });

    const first = await request(app).get('/health');
    await request(app).get('/health');
    const blocked = await request(app).get('/health');

    expect(first.status).toBe(200);
    expect(first.headers).toHaveProperty('ratelimit');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/Muitas requisições/);
    expect(blocked.headers).toHaveProperty('retry-after');
  });

  it('conta o limite separadamente por IP', async () => {
    const app = appWith({ rateLimit: { windowMs: 60_000, max: 1 }, trustProxy: 1 });

    const ipA = await request(app).get('/health').set('X-Forwarded-For', '10.0.0.1');
    const ipB = await request(app).get('/health').set('X-Forwarded-For', '10.0.0.2');
    const ipAAgain = await request(app).get('/health').set('X-Forwarded-For', '10.0.0.1');

    expect(ipA.status).toBe(200);
    expect(ipB.status).toBe(200);
    expect(ipAAgain.status).toBe(429);
  });

  it('aplica um limite mais rígido nas rotas de login', async () => {
    const app = appWith({ authRateLimit: { windowMs: 60_000, max: 1 } });

    // corpo inválido: responde 400 sem tocar no banco, mas conta no limite
    const first = await request(app).post('/api/auth/login').send({});
    const blocked = await request(app).post('/api/auth/login').send({});
    const health = await request(app).get('/health');

    expect(first.status).toBe(400);
    expect(blocked.status).toBe(429);
    expect(health.status).toBe(200);
  });
});

describe('Rate limit por usuário (token)', () => {
  const tokens = new TokenService(defaultAppConfig.jwtSecret, defaultAppConfig.accessTokenTtlMinutes);
  const tokenFor = (userId: string) => tokens.signAccessToken({ userId, role: 'USER' });
  const userA = tokenFor('6f1c1f1e-0000-4000-8000-00000000000a');
  const userB = tokenFor('6f1c1f1e-0000-4000-8000-00000000000b');

  // id inválido: responde 400 na validação, sem tocar no banco, mas passa pelo limite
  const call = (app: ReturnType<typeof appWith>, token: string) =>
    request(app).get('/api/drivers/123').set('Authorization', `Bearer ${token}`);

  it('limita cada usuário separadamente, mesmo vindo do mesmo IP', async () => {
    const app = appWith({ userRateLimit: { windowMs: 60_000, max: 1 } });

    const first = await call(app, userA);
    const blocked = await call(app, userA);
    const otherUser = await call(app, userB);

    expect(first.status).toBe(400);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/esta conta/);
    expect(otherUser.status).toBe(400);
  });

  it('o mesmo usuário continua limitado ao trocar de IP', async () => {
    const app = appWith({ userRateLimit: { windowMs: 60_000, max: 1 }, trustProxy: 1 });

    await call(app, userA).set('X-Forwarded-For', '10.0.0.1');
    const fromOtherIp = await call(app, userA).set('X-Forwarded-For', '10.0.0.2');

    expect(fromOtherIp.status).toBe(429);
  });

  it('um novo token do mesmo usuário (após refresh) não zera o limite', async () => {
    const app = appWith({ userRateLimit: { windowMs: 60_000, max: 1 } });
    const sameUserNewToken = tokens.signAccessToken({ userId: '6f1c1f1e-0000-4000-8000-00000000000a', role: 'ADMIN' });

    await call(app, userA);
    const afterRefresh = await call(app, sameUserNewToken);

    expect(afterRefresh.status).toBe(429);
  });

  it('não se aplica a requisições sem token (401 antes do limite)', async () => {
    const app = appWith({ userRateLimit: { windowMs: 60_000, max: 1 } });

    await request(app).get('/api/cars');
    const second = await request(app).get('/api/cars');

    expect(second.status).toBe(401);
  });
});
