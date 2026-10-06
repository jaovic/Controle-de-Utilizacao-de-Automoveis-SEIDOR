import type { Role } from '@prisma/client';
import type { RequestHandler, Response } from 'express';
import type { AccessTokenPayload, TokenService } from '../../modules/auth/token.service';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Exige um access token válido, vindo do header `Authorization: Bearer` (Swagger, Postman)
 * ou do cookie httpOnly definido no login (frontend). Os dados ficam em res.locals.auth.
 */
export const authenticate =
  (tokenService: TokenService): RequestHandler =>
  (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.[ACCESS_TOKEN_COOKIE];

    if (!token) throw new UnauthorizedError();

    res.locals.auth = tokenService.verifyAccessToken(token);
    next();
  };

/** Exige que o usuário autenticado tenha uma das roles informadas. Usar depois de authenticate. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (_req, res, next) => {
    const auth = res.locals.auth as AccessTokenPayload | undefined;
    if (!auth) throw new UnauthorizedError();
    if (!roles.includes(auth.role)) throw new ForbiddenError();
    next();
  };

export const getAuth = (res: Response) => res.locals.auth as AccessTokenPayload;
