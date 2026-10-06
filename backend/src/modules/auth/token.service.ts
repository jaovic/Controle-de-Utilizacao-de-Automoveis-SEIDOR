import type { Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../shared/errors/AppError';

export type AccessTokenPayload = { userId: string; role: Role };

// "audience" separa os tipos de JWT: um challenge de 2FA nunca serve como access token e vice-versa.
const ACCESS_AUDIENCE = 'access';
const CHALLENGE_AUDIENCE = '2fa-challenge';
const CHALLENGE_TTL_SECONDS = 5 * 60;

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly accessTokenTtlMinutes: number,
  ) {}

  get accessTokenTtlSeconds() {
    return this.accessTokenTtlMinutes * 60;
  }

  signAccessToken({ userId, role }: AccessTokenPayload) {
    return jwt.sign({ role }, this.secret, {
      subject: userId,
      audience: ACCESS_AUDIENCE,
      expiresIn: this.accessTokenTtlSeconds,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.secret, { audience: ACCESS_AUDIENCE }) as jwt.JwtPayload;
      return { userId: payload.sub as string, role: payload.role as Role };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Sessão expirada', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Token inválido', 'INVALID_TOKEN');
    }
  }

  signChallengeToken(userId: string) {
    return jwt.sign({}, this.secret, {
      subject: userId,
      audience: CHALLENGE_AUDIENCE,
      expiresIn: CHALLENGE_TTL_SECONDS,
    });
  }

  verifyChallengeToken(token: string): string {
    try {
      const payload = jwt.verify(token, this.secret, { audience: CHALLENGE_AUDIENCE }) as jwt.JwtPayload;
      return payload.sub as string;
    } catch {
      throw new UnauthorizedError('Verificação expirada. Faça login novamente.', 'CHALLENGE_EXPIRED');
    }
  }

  /** Refresh token opaco (aleatório). Apenas o hash é persistido. */
  generateRefreshToken() {
    const token = randomBytes(48).toString('base64url');
    return { token, tokenHash: sha256(token) };
  }
}
