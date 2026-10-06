import type { User } from '@prisma/client';

/** Representação pública do usuário: nunca expõe hash de senha nem dados do código 2FA. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    phoneVerified: user.phoneVerifiedAt !== null,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
