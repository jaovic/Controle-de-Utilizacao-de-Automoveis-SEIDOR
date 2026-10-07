import type { SmsProvider } from './SmsProvider';

/** Provider de desenvolvimento: apenas escreve a mensagem no log. */
export class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, message: string) {
    console.log(`[SMS para ${to}] ${message}`);
    return { exposeCode: true };
  }
}
