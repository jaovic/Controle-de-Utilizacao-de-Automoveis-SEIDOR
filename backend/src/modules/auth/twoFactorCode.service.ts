import type { TwoFactorPurpose, User } from '@prisma/client';
import { randomInt, timingSafeEqual } from 'node:crypto';
import type { SmsProvider } from '../../infra/sms/SmsProvider';
import { AppError } from '../../shared/errors/AppError';
import type { UsersRepository } from '../users/users.repository';
import { sha256 } from './token.service';

export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
/** Intervalo mínimo entre dois envios de SMS para o mesmo usuário */
export const RESEND_COOLDOWN_MS = 30 * 1000;

const MESSAGES: Record<TwoFactorPurpose, (code: string) => string> = {
  PHONE_VERIFICATION: (code) => `TTP: seu código de verificação de cadastro é ${code}. Expira em 5 minutos.`,
  LOGIN: (code) => `TTP: seu código de acesso é ${code}. Expira em 5 minutos.`,
};

/**
 * Gera, envia por SMS e valida os códigos de 6 dígitos usados na verificação do telefone
 * e no login com dois fatores. O código fica salvo apenas como hash, com validade e
 * limite de tentativas.
 */
export class TwoFactorCodeService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly smsProvider: SmsProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Retorna o código apenas quando ele pode aparecer na tela (desenvolvimento ou modo demonstração). */
  async issue(user: User, purpose: TwoFactorPurpose): Promise<string | undefined> {
    const now = this.now().getTime();

    if (user.twoFactorCodeExpiresAt) {
      const issuedAt = user.twoFactorCodeExpiresAt.getTime() - CODE_TTL_MS;
      if (now - issuedAt < RESEND_COOLDOWN_MS) {
        throw new AppError('Aguarde alguns segundos antes de solicitar um novo código', 429, undefined, 'CODE_COOLDOWN');
      }
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.usersRepository.update(user.id, {
      twoFactorCode: sha256(code),
      twoFactorCodePurpose: purpose,
      twoFactorCodeExpiresAt: new Date(now + CODE_TTL_MS),
      twoFactorAttempts: 0,
    });
    const { exposeCode } = await this.smsProvider.send(user.phone, MESSAGES[purpose](code));

    return exposeCode ? code : undefined;
  }

  /** true se existe um código desse tipo ainda válido (evita reenviar SMS desnecessariamente). */
  hasPendingCode(user: User, purpose: TwoFactorPurpose) {
    return (
      user.twoFactorCodePurpose === purpose &&
      user.twoFactorCodeExpiresAt !== null &&
      user.twoFactorCodeExpiresAt > this.now()
    );
  }

  /** Valida o código; em caso de sucesso, invalida-o para que não possa ser reutilizado. */
  async verify(user: User, purpose: TwoFactorPurpose, code: string) {
    if (!user.twoFactorCode || user.twoFactorCodePurpose !== purpose || !user.twoFactorCodeExpiresAt) {
      throw new AppError('Nenhum código pendente. Solicite um novo código.', 400, undefined, 'CODE_NOT_FOUND');
    }
    if (user.twoFactorCodeExpiresAt <= this.now()) {
      throw new AppError('Código expirado. Solicite um novo código.', 400, undefined, 'CODE_EXPIRED');
    }
    if (user.twoFactorAttempts >= MAX_ATTEMPTS) {
      throw new AppError('Muitas tentativas inválidas. Solicite um novo código.', 429, undefined, 'CODE_ATTEMPTS_EXCEEDED');
    }

    const expected = Buffer.from(user.twoFactorCode, 'hex');
    const received = Buffer.from(sha256(code), 'hex');
    if (!timingSafeEqual(expected, received)) {
      await this.usersRepository.update(user.id, { twoFactorAttempts: { increment: 1 } });
      throw new AppError('Código inválido', 400, undefined, 'CODE_INVALID');
    }

    await this.usersRepository.update(user.id, {
      twoFactorCode: null,
      twoFactorCodePurpose: null,
      twoFactorCodeExpiresAt: null,
      twoFactorAttempts: 0,
    });
  }
}
