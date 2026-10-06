import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app';
import { defaultAppConfig } from '../src/config/appConfig';
import { TokenService } from '../src/modules/auth/token.service';

// Testes da camada HTTP que não chegam ao banco: o PrismaClient é um stub vazio.
const app = createApp({ prisma: {} as PrismaClient });
const tokens = new TokenService(defaultAppConfig.jwtSecret, defaultAppConfig.accessTokenTtlMinutes);
const userToken = tokens.signAccessToken({ userId: '6f1c1f1e-0000-4000-8000-000000000001', role: 'USER' });
const adminToken = tokens.signAccessToken({ userId: '6f1c1f1e-0000-4000-8000-000000000002', role: 'ADMIN' });

describe('App (HTTP)', () => {
  it('GET /health responde ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /docs.json expõe a especificação OpenAPI', async () => {
    const response = await request(app).get('/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
  });

  it('retorna 404 para rota inexistente', async () => {
    const response = await request(app).get('/api/nada');

    expect(response.status).toBe(404);
  });

  describe('autenticação', () => {
    it('exige token nas rotas de domínio', async () => {
      const response = await request(app).get('/api/cars');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejeita token inválido', async () => {
      const response = await request(app).get('/api/cars').set('Authorization', 'Bearer invalido');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('aceita o access token pelo cookie', async () => {
      const response = await request(app).get('/api/drivers/123').set('Cookie', `access_token=${userToken}`);

      // passou pela autenticação e parou na validação do id
      expect(response.status).toBe(400);
    });

    it('um token de outro tipo (challenge 2FA) não serve como access token', async () => {
      const challenge = tokens.signChallengeToken('6f1c1f1e-0000-4000-8000-000000000001');
      const response = await request(app).get('/api/cars').set('Authorization', `Bearer ${challenge}`);

      expect(response.status).toBe(401);
    });

    it('valida o corpo do cadastro', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ana', email: 'nao-e-email', phone: '11999', password: '123' });

      expect(response.status).toBe(400);
      expect(Object.keys(response.body.error.details.body)).toEqual(
        expect.arrayContaining(['email', 'phone', 'password']),
      );
    });

    it('/api/auth/me exige autenticação', async () => {
      expect((await request(app).get('/api/auth/me')).status).toBe(401);
    });
  });

  describe('roles', () => {
    it('USER não pode cadastrar automóvel', async () => {
      const response = await request(app)
        .post('/api/cars')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ plate: 'ABC1D23', color: 'Prata', brand: 'Fiat' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('USER não acessa a gestão de usuários', async () => {
      const response = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('ADMIN passa pela autorização (e cai na validação do corpo)', async () => {
      const response = await request(app)
        .post('/api/cars')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plate: 'inválida' });

      expect(response.status).toBe(400);
      expect(response.body.error.details.body).toHaveProperty('color');
    });

    it('USER pode acessar rotas de utilização (validação do filtro)', async () => {
      const response = await request(app).get('/api/usages?active=talvez').set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });
  });

  it('retorna 400 para JSON malformado', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
  });
});
