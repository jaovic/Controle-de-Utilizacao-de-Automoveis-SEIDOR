import type { Car, CarUsage, Driver, User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { CarsRepository } from '../../src/modules/cars/cars.repository';
import type { DriversRepository } from '../../src/modules/drivers/drivers.repository';
import type { UsagesRepository } from '../../src/modules/usages/usages.repository';
import type { UsersRepository } from '../../src/modules/users/users.repository';
import type { RefreshTokensRepository } from '../../src/modules/auth/refreshTokens.repository';

const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });

export const makeCar = (overrides: Partial<Car> = {}): Car => ({
  id: randomUUID(),
  plate: 'ABC1D23',
  color: 'Prata',
  brand: 'Fiat',
  ...timestamps(),
  ...overrides,
});

export const makeDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: randomUUID(),
  name: 'Maria Souza',
  ...timestamps(),
  ...overrides,
});

export const makeUsage = (overrides: Partial<CarUsage> = {}): CarUsage => ({
  id: randomUUID(),
  carId: randomUUID(),
  driverId: randomUUID(),
  startedAt: new Date('2026-10-01T08:00:00Z'),
  endedAt: null,
  reason: 'Visita a cliente',
  ...timestamps(),
  ...overrides,
});

export const mockCarsRepository = (): jest.Mocked<CarsRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findByPlate: jest.fn(),
  list: jest.fn(),
  hasUsages: jest.fn(),
});

export const mockDriversRepository = (): jest.Mocked<DriversRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  list: jest.fn(),
  hasUsages: jest.fn(),
});

export const mockUsagesRepository = (): jest.Mocked<UsagesRepository> => ({
  create: jest.fn(),
  finish: jest.fn(),
  findById: jest.fn(),
  findActiveByCar: jest.fn(),
  findActiveByDriver: jest.fn(),
  list: jest.fn(),
});

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: randomUUID(),
  name: 'Maria Souza',
  email: 'maria@ttp.local',
  passwordHash: 'hash',
  role: 'USER',
  ...timestamps(),
  ...overrides,
});

export const mockUsersRepository = (): jest.Mocked<UsersRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  list: jest.fn(),
  countByRole: jest.fn(),
});

export const mockRefreshTokensRepository = (): jest.Mocked<RefreshTokensRepository> => ({
  create: jest.fn(),
  findByHash: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
});
