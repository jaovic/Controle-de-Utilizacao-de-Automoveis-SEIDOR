import type { CookieOptions, Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, getAuth } from '../../shared/middlewares/auth';
import type { AuthService, Session } from './auth.service';
import type { LoginInput, RegisterInput } from './auth.schemas';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieSecure: boolean,
  ) {}

  register = async (req: Request, res: Response) => {
    this.sendSession(res, await this.authService.register(req.body as RegisterInput), 201);
  };

  login = async (req: Request, res: Response) => {
    this.sendSession(res, await this.authService.login(req.body as LoginInput));
  };

  refresh = async (req: Request, res: Response) => {
    try {
      this.sendSession(res, await this.authService.refresh(this.readRefreshToken(req)));
    } catch (error) {
      this.clearCookies(res);
      throw error;
    }
  };

  logout = async (req: Request, res: Response) => {
    await this.authService.logout(this.readRefreshToken(req));
    this.clearCookies(res);
    res.status(204).send();
  };

  me = async (_req: Request, res: Response) => {
    res.json(await this.authService.me(getAuth(res).userId));
  };

  /** O refresh token pode vir no body (Postman/Swagger) ou no cookie (frontend). */
  private readRefreshToken(req: Request): string | undefined {
    return (req.body as { refreshToken?: string } | undefined)?.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
  }

  private cookieOptions(maxAgeMs: number): CookieOptions {
    return { httpOnly: true, secure: this.cookieSecure, sameSite: 'lax', path: '/', maxAge: maxAgeMs };
  }

  /** Define os cookies httpOnly (frontend) e também devolve os tokens no body (clientes de API). */
  private sendSession(res: Response, session: Session, status = 200) {
    res.cookie(ACCESS_TOKEN_COOKIE, session.accessToken, this.cookieOptions(session.expiresIn * 1000));
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      session.refreshToken,
      this.cookieOptions(session.refreshExpiresAt.getTime() - Date.now()),
    );
    res.status(status).json({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      user: session.user,
    });
  }

  private clearCookies(res: Response) {
    const { maxAge: _maxAge, ...options } = this.cookieOptions(0);
    res.clearCookie(ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(REFRESH_TOKEN_COOKIE, options);
  }
}
