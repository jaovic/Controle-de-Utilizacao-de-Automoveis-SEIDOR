import twilio from 'twilio';
import { AppError } from '../../shared/errors/AppError';
import type { SmsProvider } from './SmsProvider';

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
      console.error('Falha ao enviar SMS pela Twilio:', error);
      throw new AppError('Não foi possível enviar o SMS. Tente novamente em instantes.', 502, undefined, 'SMS_FAILED');
    }
  }
}
