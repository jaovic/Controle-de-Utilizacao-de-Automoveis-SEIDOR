import { type RequestHandler, Router } from 'express';
import { validate } from '../../shared/middlewares/validate';
import type { AuthController } from './auth.controller';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas';

type AuthRoutesDeps = {
  controller: AuthController;
  /** autenticação + limite por usuário */
  authenticate: RequestHandler[];
  /** limite mais rígido para rotas sujeitas a força bruta (cadastro e login) */
  strictRateLimit: RequestHandler;
};

export function authRoutes({ controller, authenticate, strictRateLimit }: AuthRoutesDeps) {
  const router = Router();

  router.post('/register', strictRateLimit, validate({ body: registerSchema }), controller.register);
  router.post('/login', strictRateLimit, validate({ body: loginSchema }), controller.login);
  router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
  router.post('/logout', validate({ body: refreshSchema }), controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
