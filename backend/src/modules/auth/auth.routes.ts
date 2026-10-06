import { type RequestHandler, Router } from 'express';
import { validate } from '../../shared/middlewares/validate';
import type { AuthController } from './auth.controller';
import {
  loginSchema,
  loginVerifySchema,
  refreshSchema,
  registerSchema,
  resendCodeSchema,
  twoFactorSettingsSchema,
  verifyPhoneSchema,
} from './auth.schemas';

type AuthRoutesDeps = {
  controller: AuthController;
  /** autenticação + limite por usuário */
  authenticate: RequestHandler[];
  /** limite mais rígido para rotas sujeitas a força bruta (login, códigos SMS) */
  strictRateLimit: RequestHandler;
};

export function authRoutes({ controller, authenticate, strictRateLimit }: AuthRoutesDeps) {
  const router = Router();

  router.post('/register', strictRateLimit, validate({ body: registerSchema }), controller.register);
  router.post('/verify-phone', strictRateLimit, validate({ body: verifyPhoneSchema }), controller.verifyPhone);
  router.post('/resend-code', strictRateLimit, validate({ body: resendCodeSchema }), controller.resendCode);
  router.post('/login', strictRateLimit, validate({ body: loginSchema }), controller.login);
  router.post('/login/verify', strictRateLimit, validate({ body: loginVerifySchema }), controller.verifyLogin);
  router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
  router.post('/logout', validate({ body: refreshSchema }), controller.logout);

  router.get('/me', authenticate, controller.me);
  router.patch('/me/two-factor', authenticate, validate({ body: twoFactorSettingsSchema }), controller.setTwoFactor);

  return router;
}
