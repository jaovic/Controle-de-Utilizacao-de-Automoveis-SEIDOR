import type { SmsProvider } from './SmsProvider';

/** Provider de desenvolvimento: apenas escreve a mensagem no log. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly exposesCodes = true;

  async send(to: string, message: string) {
    console.log(`[SMS para ${to}] ${message}`);
  }
}
