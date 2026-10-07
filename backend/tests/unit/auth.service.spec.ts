import bcrypt from 'bcryptjs';
import { AuthService } from '../../src/modules/auth/auth.service';
import { sha256, TokenService } from '../../src/modules/auth/token.service';
import { makeUser, mockRefreshTokensRepository, mockUsersRepository } from '../helpers/factories';

const NOW = new Date('2026-10-07T12:00:00Z');
const PASSWORD = 'Senha@123';

describe('AuthService', () => {
  let users: ReturnType<typeof mockUsersRepository>;
  let refreshTokens: ReturnType<typeof mockRefreshTokensRepository>;
  let tokens: TokenService;
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    users = mockUsersRepository();
    refreshTokens = mockRefreshTokensRepository();
    tokens = new TokenService('test-secret-with-at-least-32-characters!!', 15);
    service = new AuthService(users, refreshTokens, tokens, 7, () => NOW);
  });

  describe('register', () => {
    const input = { name: 'Maria', email: 'maria@ttp.local', password: PASSWORD };

    it('cria o usuário com a senha em hash e já abre a sessão', async () => {
      const user = makeUser();
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(user);

      const session = await service.register(input);

      const created = users.create.mock.calls[0][0];
      expect(created.passwordHash).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, created.passwordHash)).toBe(true);
      expect(tokens.verifyAccessToken(session.accessToken)).toEqual({ userId: user.id, role: 'USER' });
      expect(session.user).not.toHaveProperty('passwordHash');
      expect(refreshTokens.create).toHaveBeenCalled();
    });

    it('rejeita e-mail já cadastrado', async () => {
      users.findByEmail.mockResolvedValue(makeUser());

      await expect(service.register(input)).rejects.toMatchObject({ statusCode: 409 });
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejeita senha errada', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await expect(service.login({ email: 'maria@ttp.local', password: 'errada1' })).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('rejeita e-mail inexistente com a mesma mensagem (não revela se a conta existe)', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'ninguem@ttp.local', password: PASSWORD })).rejects.toMatchObject({
        statusCode: 401,
        message: 'E-mail ou senha inválidos',
      });
    });

    it('emite access token (com a role) e refresh token salvo como hash', async () => {
      const user = makeUser({ passwordHash, role: 'ADMIN' });
      users.findByEmail.mockResolvedValue(user);

      const session = await service.login({ email: user.email, password: PASSWORD });

      expect(tokens.verifyAccessToken(session.accessToken)).toEqual({ userId: user.id, role: 'ADMIN' });
      expect(session.expiresIn).toBe(15 * 60);
      expect(refreshTokens.create).toHaveBeenCalledWith({
        userId: user.id,
        tokenHash: sha256(session.refreshToken),
        expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
    });
  });

  describe('refresh', () => {
    const storedToken = (overrides = {}) => ({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: sha256('token'),
      expiresAt: new Date(NOW.getTime() + 60_000),
      revokedAt: null,
      createdAt: NOW,
      ...overrides,
    });

    it('rotaciona: revoga o token usado e emite um novo par', async () => {
      refreshTokens.findByHash.mockResolvedValue(storedToken());
      users.findById.mockResolvedValue(makeUser({ id: 'user-1' }));

      const session = await service.refresh('token');

      expect(refreshTokens.revoke).toHaveBeenCalledWith('rt-1');
      expect(session.refreshToken).not.toBe('token');
      expect(refreshTokens.create).toHaveBeenCalled();
    });

    it('reuso de token revogado derruba todas as sessões do usuário', async () => {
      refreshTokens.findByHash.mockResolvedValue(storedToken({ revokedAt: NOW }));

      await expect(service.refresh('token')).rejects.toMatchObject({ statusCode: 401 });
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejeita token expirado ou ausente', async () => {
      refreshTokens.findByHash.mockResolvedValue(storedToken({ expiresAt: new Date(NOW.getTime() - 1) }));

      await expect(service.refresh('token')).rejects.toMatchObject({ statusCode: 401 });
      await expect(service.refresh(undefined)).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('logout', () => {
    it('revoga o refresh token informado', async () => {
      refreshTokens.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: sha256('token'),
        expiresAt: NOW,
        revokedAt: null,
        createdAt: NOW,
      });

      await service.logout('token');

      expect(refreshTokens.revoke).toHaveBeenCalledWith('rt-1');
    });

    it('sem token, não faz nada', async () => {
      await service.logout(undefined);

      expect(refreshTokens.findByHash).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('retorna os dados públicos do usuário', async () => {
      users.findById.mockResolvedValue(makeUser({ passwordHash }));

      const me = await service.me('id');

      expect(me).not.toHaveProperty('passwordHash');
      expect(me.email).toBe('maria@ttp.local');
    });
  });
});
