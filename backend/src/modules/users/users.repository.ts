import type { Prisma, PrismaClient, Role, User } from '@prisma/client';

export type CreateUserData = {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
};

export interface UsersRepository {
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
  countByRole(role: Role): Promise<number>;
}

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  list() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  }

  countByRole(role: Role) {
    return this.prisma.user.count({ where: { role } });
  }
}
