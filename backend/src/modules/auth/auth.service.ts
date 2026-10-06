import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError, ConflictError, ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError';
import { toPublicUser } from '../users/users.presenter';
import type { UsersRepository } from '../users/users.repository';
import type { LoginInput, LoginVerifyInput, RegisterInput, TwoFactorSettingsInput, VerifyPhoneInput } from './auth.schemas';
import type { RefreshTokensRepository } from './refreshTokens.repository';
import { sha256, type TokenService } from './token.service';
import type { TwoFactorCodeService } from './twoFactorCode.service';

const BCRYPT_ROUNDS = 10;

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** validade do access token, em segundos */
  expiresIn: number;
  refreshExpiresAt: Date;
  user: ReturnType<typeof toPublicUser>;
};

export type LoginResult =
  | { requiresTwoFactor: false; session: Session }
  | { requiresTwoFactor: true; challengeToken: string; devCode?: string };

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly tokenService: TokenService,
    private readonly twoFactorCodes: TwoFactorCodeService,
    private readonly refreshTokenTtlDays: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Cria a conta (role USER) e envia o SMS de verificação do telefone. */
  async register({ name, email, phone, password }: RegisterInput) {
    if (await this.usersRepository.findByEmail(email)) {
      throw new ConflictError('Já existe uma conta com este e-mail');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.create({ name, email, phone, passwordHash });
    const devCode = await this.twoFactorCodes.issue(user, 'PHONE_VERIFICATION');

    return { user: toPublicUser(user), devCode };
  }

  /** Confirma o telefone com o código do cadastro. Só depois disso o primeiro login é permitido. */
  async verifyPhone({ email, code }: VerifyPhoneInput) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new AppError('Código inválido', 400, undefined, 'CODE_INVALID');
    if (user.phoneVerifiedAt) throw new ConflictError('Este telefone já foi verificado');

    await this.twoFactorCodes.verify(user, 'PHONE_VERIFICATION', code);
    const verified = await this.usersRepository.update(user.id, { phoneVerifiedAt: this.now() });

    return toPublicUser(verified);
  }

  /** Reenvia o código de verificação do cadastro. Resposta neutra se o e-mail não existir. */
  async resendVerificationCode(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || user.phoneVerifiedAt) return { devCode: undefined };

    return { devCode: await this.twoFactorCodes.issue(user, 'PHONE_VERIFICATION') };
  }

  async login({ email, password }: LoginInput): Promise<LoginResult> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('E-mail ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    if (!user.phoneVerifiedAt) {
      // Reenvia o código automaticamente se não houver um válido, para o usuário concluir a verificação.
      const devCode = this.twoFactorCodes.hasPendingCode(user, 'PHONE_VERIFICATION')
        ? undefined
        : await this.twoFactorCodes.issue(user, 'PHONE_VERIFICATION');
      throw new ForbiddenError('Confirme seu telefone antes do primeiro login', 'PHONE_NOT_VERIFIED', {
        email: user.email,
        devCode,
      });
    }

    if (user.twoFactorEnabled) {
      const devCode = await this.twoFactorCodes.issue(user, 'LOGIN');
      return { requiresTwoFactor: true, challengeToken: this.tokenService.signChallengeToken(user.id), devCode };
    }

    return { requiresTwoFactor: false, session: await this.createSession(user) };
  }

  /** Segunda etapa do login com 2FA ativo. */
  async verifyLogin({ challengeToken, code }: LoginVerifyInput) {
    const userId = this.tokenService.verifyChallengeToken(challengeToken);
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado');

    await this.twoFactorCodes.verify(user, 'LOGIN', code);
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

  /** Liga/desliga o código por SMS em todo login. Exige a senha atual como confirmação. */
  async setTwoFactor(userId: string, { enabled, password }: TwoFactorSettingsInput) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Senha incorreta', 400, undefined, 'INVALID_PASSWORD');
    }

    const updated = await this.usersRepository.update(user.id, { twoFactorEnabled: enabled });
    return toPublicUser(updated);
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
