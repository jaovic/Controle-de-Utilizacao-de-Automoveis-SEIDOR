import { env } from '../../config/env';
import { ConsoleSmsProvider } from './ConsoleSmsProvider';
import { DemoFallbackSmsProvider } from './DemoFallbackSmsProvider';
import type { SmsProvider } from './SmsProvider';
import { TwilioSmsProvider } from './TwilioSmsProvider';

export function createSmsProvider(): SmsProvider {
  if (env.SMS_PROVIDER === 'twilio') {
    const twilio = new TwilioSmsProvider(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!, env.TWILIO_FROM_NUMBER!);
    return env.SMS_DEMO_FALLBACK ? new DemoFallbackSmsProvider(twilio) : twilio;
  }
  return new ConsoleSmsProvider();
}
