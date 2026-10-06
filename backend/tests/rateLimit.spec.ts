import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app';
import { type AppConfig, defaultAppConfig } from '../src/config/appConfig';

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
