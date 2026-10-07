import { AppError } from '../../shared/errors/AppError';
import type { SmsProvider } from './SmsProvider';

/**
 * Códigos da Twilio causados por limitação da conta (não por erro do usuário):
 * 21608 = número não verificado em conta trial; 21408 = país não habilitado nas Geo Permissions.
 */
const ACCOUNT_LIMITATION_CODES = [21608, 21408];

/**
 * Modo demonstração (SMS_DEMO_FALLBACK=true): tenta enviar pelo provider real e, se o envio
 * for recusado por limitação da conta de SMS (ex.: Twilio trial), libera o código para ser
 * exibido na tela. Assim qualquer pessoa consegue testar o fluxo de cadastro e 2FA, enquanto
 * números verificados continuam recebendo o SMS de verdade.
 *
 * Erros do usuário (ex.: número inválido) e falhas inesperadas continuam sendo propagados.
 * Não usar em produção real: para quem cai no fallback, o código fica visível na tela.
 */
export class DemoFallbackSmsProvider implements SmsProvider {
  constructor(private readonly inner: SmsProvider) {}

  async send(to: string, message: string) {
    try {
      return await this.inner.send(to, message);
    } catch (error) {
      const twilioCode = error instanceof AppError ? (error.details as { twilioCode?: number } | undefined)?.twilioCode : undefined;
      if (twilioCode && ACCOUNT_LIMITATION_CODES.includes(twilioCode)) {
        console.warn(`[modo demonstração] SMS para ${to} recusado (Twilio ${twilioCode}); o código será exibido na tela.`);
        return { exposeCode: true };
      }
      throw error;
    }
  }
}
