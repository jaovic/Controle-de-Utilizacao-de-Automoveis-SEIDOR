import { DemoFallbackSmsProvider } from '../../src/infra/sms/DemoFallbackSmsProvider';
import type { SmsProvider } from '../../src/infra/sms/SmsProvider';
import { AppError } from '../../src/shared/errors/AppError';

const twilioError = (twilioCode: number) => new AppError('falhou', 400, { twilioCode }, 'SMS_FAILED');

describe('DemoFallbackSmsProvider', () => {
  let inner: jest.Mocked<SmsProvider>;
  let provider: DemoFallbackSmsProvider;

  beforeEach(() => {
    inner = { send: jest.fn() };
    provider = new DemoFallbackSmsProvider(inner);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('quando o SMS é entregue, não expõe o código', async () => {
    inner.send.mockResolvedValue({ exposeCode: false });

    await expect(provider.send('+5511999998888', 'msg')).resolves.toEqual({ exposeCode: false });
  });

  it('número não verificado no trial (21608): libera o código na tela', async () => {
    inner.send.mockRejectedValue(twilioError(21608));

    await expect(provider.send('+5511999998888', 'msg')).resolves.toEqual({ exposeCode: true });
  });

  it('país não habilitado (21408): libera o código na tela', async () => {
    inner.send.mockRejectedValue(twilioError(21408));

    await expect(provider.send('+5511999998888', 'msg')).resolves.toEqual({ exposeCode: true });
  });

  it('número inválido continua sendo erro', async () => {
    inner.send.mockRejectedValue(twilioError(21211));

    await expect(provider.send('+5511999998888', 'msg')).rejects.toMatchObject({ code: 'SMS_FAILED' });
  });

  it('falhas inesperadas continuam sendo erro', async () => {
    inner.send.mockRejectedValue(new AppError('fora do ar', 502, undefined, 'SMS_FAILED'));

    await expect(provider.send('+5511999998888', 'msg')).rejects.toMatchObject({ statusCode: 502 });
  });
});
