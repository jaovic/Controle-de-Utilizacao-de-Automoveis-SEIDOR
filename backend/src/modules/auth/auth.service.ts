import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError';
import { toPublicUser } from '../users/users.presenter';
import type { UsersRepository } from '../users/users.repository';
import type { LoginInput, RegisterInput } from './auth.schemas';
import type { RefreshTokensRepository } from './refreshTokens.repository';
import { sha256, type TokenService } from './token.service';

const BCRYPT_ROUNDS = 10;

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** validade do access token, em segundos */
  expiresIn: number;
  refreshExpiresAt: Date;
  user: ReturnType<typeof toPublicUser>;
};

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenTtlDays: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Cria a conta (role USER) e já abre a sessão. */
  async register({ name, email, password }: RegisterInput) {
    if (await this.usersRepository.findByEmail(email)) {
      throw new ConflictError('Já existe uma conta com este e-mail');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.create({ name, email, passwordHash });

    return this.createSession(user);
  }

  async login({ email, password }: LoginInput) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('E-mail ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    return this.createSession(user);
  }

  /**
   * Troca um refresh token válido por um novo par (rotação).
   * Se um token já revogado for reutilizado, assume vazamento e revoga todas as sessões do usuário.
   */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedError('Refresh token ausente', 'INVALID_REFRESH_TOKEN');

    const stored = await this.refreshTokensRepository.findByHash(sha256(refreshToken));
    if (!stored) throw new UnauthorizedError('Sessão inválida', 'INVALID_REFRESH_TOKEN');

    if (stored.revokedAt) {
      await this.refreshTokensRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedError('Sessão inválida', 'INVALID_REFRESH_TOKEN');
    }
    if (stored.expiresAt <= this.now()) {
      throw new UnauthorizedError('Sessão expirada', 'INVALID_REFRESH_TOKEN');
    }

    const user = await this.usersRepository.findById(stored.userId);
    if (!user) throw new UnauthorizedError('Sessão inválida', 'INVALID_REFRESH_TOKEN');

    await this.refreshTokensRepository.revoke(stored.id);
    return this.createSession(user);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const stored = await this.refreshTokensRepository.findByHash(sha256(refreshToken));
    if (stored && !stored.revokedAt) await this.refreshTokensRepository.revoke(stored.id);
  }

  async me(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado');
    return toPublicUser(user);
  }

  private async createSession(user: User): Promise<Session> {
    const { token, tokenHash } = this.tokenService.generateRefreshToken();
    const refreshExpiresAt = new Date(this.now().getTime() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.create({ userId: user.id, tokenHash, expiresAt: refreshExpiresAt });

    return {
      accessToken: this.tokenService.signAccessToken({ userId: user.id, role: user.role }),
      refreshToken: token,
      expiresIn: this.tokenService.accessTokenTtlSeconds,
      refreshExpiresAt,
      user: toPublicUser(user),
    };
  }
}
