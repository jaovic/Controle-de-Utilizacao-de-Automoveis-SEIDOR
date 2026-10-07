import bcrypt from 'bcryptjs';
import { AuthService } from '../../src/modules/auth/auth.service';
import { sha256, TokenService } from '../../src/modules/auth/token.service';
import type { TwoFactorCodeService } from '../../src/modules/auth/twoFactorCode.service';
import { makeUser, mockRefreshTokensRepository, mockUsersRepository } from '../helpers/factories';

const NOW = new Date('2026-10-07T12:00:00Z');
const PASSWORD = 'Senha@123';

describe('AuthService', () => {
  let users: ReturnType<typeof mockUsersRepository>;
  let refreshTokens: ReturnType<typeof mockRefreshTokensRepository>;
  let codes: jest.Mocked<Pick<TwoFactorCodeService, 'issue' | 'verify' | 'hasPendingCode'>>;
  let tokens: TokenService;
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    users = mockUsersRepository();
    refreshTokens = mockRefreshTokensRepository();
    codes = { issue: jest.fn(), verify: jest.fn(), hasPendingCode: jest.fn().mockReturnValue(false) };
    tokens = new TokenService('test-secret-with-at-least-32-characters!!', 15);
    service = new AuthService(users, refreshTokens, tokens, codes as unknown as TwoFactorCodeService, 7, () => NOW);
  });

  describe('register', () => {
    const input = { name: 'Maria', email: 'maria@ttp.local', phone: '+5511999998888', password: PASSWORD };

    it('cria o usuário com a senha em hash e envia o código de verificação', async () => {
      const user = makeUser({ phoneVerifiedAt: null });
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(user);
      codes.issue.mockResolvedValue('123456');

      const result = await service.register(input);

      const created = users.create.mock.calls[0][0];
      expect(created.passwordHash).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, created.passwordHash)).toBe(true);
      expect(codes.issue).toHaveBeenCalledWith(user, 'PHONE_VERIFICATION');
      expect(result.devCode).toBe('123456');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('desfaz o cadastro se o SMS não puder ser enviado', async () => {
      const user = makeUser({ phoneVerifiedAt: null });
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(user);
      codes.issue.mockRejectedValue(new Error('SMS_FAILED'));

      await expect(service.register(input)).rejects.toThrow('SMS_FAILED');
      expect(users.delete).toHaveBeenCalledWith(user.id);
    });

    it('rejeita e-mail já cadastrado', async () => {
      users.findByEmail.mockResolvedValue(makeUser());

      await expect(service.register(input)).rejects.toMatchObject({ statusCode: 409 });
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyPhone', () => {
    it('marca o telefone como verificado após validar o código', async () => {
      const user = makeUser({ phoneVerifiedAt: null });
      users.findByEmail.mockResolvedValue(user);
      users.update.mockResolvedValue({ ...user, phoneVerifiedAt: NOW });

      const result = await service.verifyPhone({ email: user.email, code: '123456' });

      expect(codes.verify).toHaveBeenCalledWith(user, 'PHONE_VERIFICATION', '123456');
      expect(users.update).toHaveBeenCalledWith(user.id, { phoneVerifiedAt: NOW });
      expect(result.phoneVerified).toBe(true);
    });

    it('rejeita se o telefone já foi verificado', async () => {
      users.findByEmail.mockResolvedValue(makeUser());

      await expect(service.verifyPhone({ email: 'maria@ttp.local', code: '123456' })).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('login', () => {
    it('rejeita credenciais inválidas', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await expect(service.login({ email: 'maria@ttp.local', password: 'errada1' })).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('bloqueia o primeiro login enquanto o telefone não for verificado', async () => {
      const user = makeUser({ passwordHash, phoneVerifiedAt: null });
      users.findByEmail.mockResolvedValue(user);
      codes.issue.mockResolvedValue('654321');

      await expect(service.login({ email: user.email, password: PASSWORD })).rejects.toMatchObject({
        statusCode: 403,
        code: 'PHONE_NOT_VERIFIED',
        details: { email: user.email, devCode: '654321' },
      });
      expect(refreshTokens.create).not.toHaveBeenCalled();
    });

    it('sem 2FA ativo, emite access e refresh token', async () => {
      const user = makeUser({ passwordHash });
      users.findByEmail.mockResolvedValue(user);

      const result = await service.login({ email: user.email, password: PASSWORD });

      if (result.requiresTwoFactor) throw new Error('não deveria exigir 2FA');
      expect(tokens.verifyAccessToken(result.session.accessToken)).toEqual({ userId: user.id, role: user.role });
      expect(refreshTokens.create).toHaveBeenCalledWith({
        userId: user.id,
        tokenHash: sha256(result.session.refreshToken),
        expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
    });

    it('com 2FA ativo, envia o código e devolve um challenge em vez dos tokens', async () => {
      const user = makeUser({ passwordHash, twoFactorEnabled: true });
      users.findByEmail.mockResolvedValue(user);

      const result = await service.login({ email: user.email, password: PASSWORD });

      expect(result.requiresTwoFactor).toBe(true);
      expect(codes.issue).toHaveBeenCalledWith(user, 'LOGIN');
      expect(refreshTokens.create).not.toHaveBeenCalled();
      if (result.requiresTwoFactor) expect(tokens.verifyChallengeToken(result.challengeToken)).toBe(user.id);
    });
  });

  describe('verifyLogin', () => {
    it('valida o código e emite a sessão', async () => {
      const user = makeUser({ twoFactorEnabled: true });
      users.findById.mockResolvedValue(user);

      const session = await service.verifyLogin({ challengeToken: tokens.signChallengeToken(user.id), code: '123456' });

      expect(codes.verify).toHaveBeenCalledWith(user, 'LOGIN', '123456');
      expect(session.accessToken).toBeDefined();
    });

    it('não aceita um access token no lugar do challenge', async () => {
      const access = tokens.signAccessToken({ userId: 'id', role: 'USER' });

      await expect(service.verifyLogin({ challengeToken: access, code: '123456' })).rejects.toMatchObject({
        code: 'CHALLENGE_EXPIRED',
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

  describe('setTwoFactor', () => {
    it('ativa o 2FA quando a senha confere', async () => {
      const user = makeUser({ passwordHash });
      users.findById.mockResolvedValue(user);
      users.update.mockResolvedValue({ ...user, twoFactorEnabled: true });

      const result = await service.setTwoFactor(user.id, { enabled: true, password: PASSWORD });

      expect(users.update).toHaveBeenCalledWith(user.id, { twoFactorEnabled: true });
      expect(result.twoFactorEnabled).toBe(true);
    });

    it('exige a senha correta', async () => {
      users.findById.mockResolvedValue(makeUser({ passwordHash }));

      await expect(service.setTwoFactor('id', { enabled: true, password: 'errada1' })).rejects.toMatchObject({
        code: 'INVALID_PASSWORD',
      });
      expect(users.update).not.toHaveBeenCalled();
    });
  });
});
