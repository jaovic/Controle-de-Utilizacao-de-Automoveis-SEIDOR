import type { SmsProvider } from '../../src/infra/sms/SmsProvider';
import { sha256 } from '../../src/modules/auth/token.service';
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  TwoFactorCodeService,
} from '../../src/modules/auth/twoFactorCode.service';
import { makeUser, mockUsersRepository } from '../helpers/factories';

const NOW = new Date('2026-10-07T12:00:00Z');

describe('TwoFactorCodeService', () => {
  let users: ReturnType<typeof mockUsersRepository>;
  let sms: jest.Mocked<SmsProvider>;
  let service: TwoFactorCodeService;

  const createService = (exposeCode: boolean) => {
    sms = { send: jest.fn().mockResolvedValue({ exposeCode }) };
    service = new TwoFactorCodeService(users, sms, () => NOW);
  };

  beforeEach(() => {
    users = mockUsersRepository();
    createService(false);
  });

  describe('issue', () => {
    it('salva apenas o hash do código, com validade, e envia o SMS', async () => {
      const user = makeUser();

      const returned = await service.issue(user, 'LOGIN');

      const saved = users.update.mock.calls[0][1];
      const sentMessage = sms.send.mock.calls[0][1];
      const code = sentMessage.match(/\d{6}/)![0];

      expect(returned).toBeUndefined(); // Twilio: o código nunca volta na resposta
      expect(sms.send).toHaveBeenCalledWith(user.phone, expect.any(String));
      expect(saved).toMatchObject({
        twoFactorCode: sha256(code),
        twoFactorCodePurpose: 'LOGIN',
        twoFactorCodeExpiresAt: new Date(NOW.getTime() + CODE_TTL_MS),
        twoFactorAttempts: 0,
      });
    });

    it('devolve o código quando o provider permite exibi-lo na tela', async () => {
      createService(true);

      const code = await service.issue(makeUser(), 'PHONE_VERIFICATION');

      expect(code).toMatch(/^\d{6}$/);
    });

    it('impede reenvio antes do intervalo mínimo', async () => {
      const user = makeUser({ twoFactorCodeExpiresAt: new Date(NOW.getTime() + CODE_TTL_MS - 5_000) });

      await expect(service.issue(user, 'LOGIN')).rejects.toMatchObject({ statusCode: 429, code: 'CODE_COOLDOWN' });
      expect(sms.send).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    const pending = (overrides = {}) =>
      makeUser({
        twoFactorCode: sha256('123456'),
        twoFactorCodePurpose: 'LOGIN',
        twoFactorCodeExpiresAt: new Date(NOW.getTime() + 60_000),
        ...overrides,
      });

    it('aceita o código correto e o invalida em seguida', async () => {
      const user = pending();

      await service.verify(user, 'LOGIN', '123456');

      expect(users.update).toHaveBeenCalledWith(user.id, expect.objectContaining({ twoFactorCode: null }));
    });

    it('rejeita código errado e conta a tentativa', async () => {
      const user = pending();

      await expect(service.verify(user, 'LOGIN', '000000')).rejects.toMatchObject({ code: 'CODE_INVALID' });
      expect(users.update).toHaveBeenCalledWith(user.id, { twoFactorAttempts: { increment: 1 } });
    });

    it('rejeita código expirado', async () => {
      const user = pending({ twoFactorCodeExpiresAt: new Date(NOW.getTime() - 1) });

      await expect(service.verify(user, 'LOGIN', '123456')).rejects.toMatchObject({ code: 'CODE_EXPIRED' });
    });

    it('bloqueia após exceder o número de tentativas', async () => {
      const user = pending({ twoFactorAttempts: MAX_ATTEMPTS });

      await expect(service.verify(user, 'LOGIN', '123456')).rejects.toMatchObject({ code: 'CODE_ATTEMPTS_EXCEEDED' });
    });

    it('não aceita um código emitido para outro propósito', async () => {
      const user = pending({ twoFactorCodePurpose: 'PHONE_VERIFICATION' });

      await expect(service.verify(user, 'LOGIN', '123456')).rejects.toMatchObject({ code: 'CODE_NOT_FOUND' });
    });
  });
});
