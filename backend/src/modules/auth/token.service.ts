import type { Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../shared/errors/AppError';

export type AccessTokenPayload = { userId: string; role: Role };

// "audience" identifica o tipo do JWT: só tokens emitidos como access token são aceitos.
const ACCESS_AUDIENCE = 'access';

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

  /** Refresh token opaco (aleatório). Apenas o hash é persistido. */
  generateRefreshToken() {
    const token = randomBytes(48).toString('base64url');
    return { token, tokenHash: sha256(token) };
  }
}
