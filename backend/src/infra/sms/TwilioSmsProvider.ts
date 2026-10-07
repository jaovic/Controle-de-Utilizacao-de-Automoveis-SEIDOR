import twilio from 'twilio';
import { AppError } from '../../shared/errors/AppError';
import type { SmsProvider } from './SmsProvider';

/**
 * Erros da Twilio mais comuns no envio, traduzidos para uma mensagem útil ao usuário.
 * https://www.twilio.com/docs/api/errors
 */
const KNOWN_ERRORS: Record<number, { message: string; status: number }> = {
  21211: { message: 'Número de telefone inválido.', status: 400 },
  21408: { message: 'Envio de SMS não habilitado para o país deste número.', status: 400 },
  21610: { message: 'Este número bloqueou o recebimento de SMS.', status: 400 },
  21614: { message: 'Este número não pode receber SMS.', status: 400 },
  21608: {
    message: 'Este número não pode receber SMS pela conta de teste (trial) da Twilio. Use um número verificado na Twilio.',
    status: 400,
  },
};

export class TwilioSmsProvider implements SmsProvider {
  readonly exposesCodes = false;
  private readonly client: ReturnType<typeof twilio>;

  constructor(
    accountSid: string,
    authToken: string,
    private readonly from: string,
  ) {
    this.client = twilio(accountSid, authToken);
  }

  async send(to: string, message: string) {
    try {
      await this.client.messages.create({ to, from: this.from, body: message });
    } catch (error) {
      const code = (error as { code?: number }).code;
      console.error(`Falha ao enviar SMS pela Twilio (código ${code ?? 'desconhecido'}):`, error);

      const known = code ? KNOWN_ERRORS[code] : undefined;
      if (known) throw new AppError(known.message, known.status, { twilioCode: code }, 'SMS_FAILED');
      throw new AppError('Não foi possível enviar o SMS. Tente novamente em instantes.', 502, undefined, 'SMS_FAILED');
    }
  }
}
