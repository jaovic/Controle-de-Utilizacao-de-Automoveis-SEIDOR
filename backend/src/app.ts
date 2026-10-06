import type { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { type AppConfig, defaultAppConfig } from './config/appConfig';
import { openApiDocument } from './docs/openapi';
import { ConsoleSmsProvider } from './infra/sms/ConsoleSmsProvider';
import type { SmsProvider } from './infra/sms/SmsProvider';
import { AuthController } from './modules/auth/auth.controller';
import { authRoutes } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import { PrismaRefreshTokensRepository } from './modules/auth/refreshTokens.repository';
import { TokenService } from './modules/auth/token.service';
import { TwoFactorCodeService } from './modules/auth/twoFactorCode.service';
import { CarsController } from './modules/cars/cars.controller';
import { PrismaCarsRepository } from './modules/cars/cars.repository';
import { carsRoutes } from './modules/cars/cars.routes';
import { CarsService } from './modules/cars/cars.service';
import { DriversController } from './modules/drivers/drivers.controller';
import { PrismaDriversRepository } from './modules/drivers/drivers.repository';
import { driversRoutes } from './modules/drivers/drivers.routes';
import { DriversService } from './modules/drivers/drivers.service';
import { UsagesController } from './modules/usages/usages.controller';
import { PrismaUsagesRepository } from './modules/usages/usages.repository';
import { usagesRoutes } from './modules/usages/usages.routes';
import { UsagesService } from './modules/usages/usages.service';
import { UsersController } from './modules/users/users.controller';
import { PrismaUsersRepository } from './modules/users/users.repository';
import { usersRoutes } from './modules/users/users.routes';
import { UsersService } from './modules/users/users.service';
import { authenticate } from './shared/middlewares/auth';
import { errorHandler, notFoundHandler } from './shared/middlewares/errorHandler';
import { createRateLimiter, createUserRateLimiter } from './shared/middlewares/rateLimiter';

export type AppDependencies = {
  prisma: PrismaClient;
  config?: AppConfig;
  smsProvider?: SmsProvider;
};

/**
 * Monta a aplicação Express (composition root). As dependências externas (banco, SMS, config)
 * chegam por parâmetro, o que permite subir a app nos testes sem banco nem Twilio.
 */
export function createApp({ prisma, config = defaultAppConfig, smsProvider = new ConsoleSmsProvider() }: AppDependencies) {
  const tokenService = new TokenService(config.jwtSecret, config.accessTokenTtlMinutes);

  const carsRepository = new PrismaCarsRepository(prisma);
  const driversRepository = new PrismaDriversRepository(prisma);
  const usagesRepository = new PrismaUsagesRepository(prisma);
  const usersRepository = new PrismaUsersRepository(prisma);
  const refreshTokensRepository = new PrismaRefreshTokensRepository(prisma);

  const authService = new AuthService(
    usersRepository,
    refreshTokensRepository,
    tokenService,
    new TwoFactorCodeService(usersRepository, smsProvider),
    config.refreshTokenTtlDays,
  );

  const authController = new AuthController(authService, config.cookieSecure);
  const usersController = new UsersController(new UsersService(usersRepository));
  const carsController = new CarsController(new CarsService(carsRepository));
  const driversController = new DriversController(new DriversService(driversRepository));
  const usagesController = new UsagesController(
    new UsagesService(usagesRepository, carsRepository, driversRepository),
  );

  // Rotas autenticadas: valida o token e aplica o limite por usuário (além do limite global por IP).
  const requireAuth = [authenticate(tokenService), createUserRateLimiter(config.userRateLimit)];

  const app = express();
  app.set('trust proxy', config.trustProxy);

  // CSP desativada apenas para o Swagger UI carregar seus assets inline.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(createRateLimiter(config.rateLimit));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/', (_req, res) => res.redirect('/docs'));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(
    '/api/auth',
    authRoutes({
      controller: authController,
      authenticate: requireAuth,
      strictRateLimit: createRateLimiter(config.authRateLimit),
    }),
  );
  app.use('/api/users', requireAuth, usersRoutes(usersController));
  app.use('/api/cars', requireAuth, carsRoutes(carsController));
  app.use('/api/drivers', requireAuth, driversRoutes(driversController));
  app.use('/api/usages', requireAuth, usagesRoutes(usagesController));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
