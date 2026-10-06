import { env } from '../../config/env';
import { ConsoleSmsProvider } from './ConsoleSmsProvider';
import type { SmsProvider } from './SmsProvider';
import { TwilioSmsProvider } from './TwilioSmsProvider';

export function createSmsProvider(): SmsProvider {
  if (env.SMS_PROVIDER === 'twilio') {
    return new TwilioSmsProvider(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!, env.TWILIO_FROM_NUMBER!);
  }
  return new ConsoleSmsProvider();
}
