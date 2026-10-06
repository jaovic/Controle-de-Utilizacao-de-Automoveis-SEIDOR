import { Alert } from "./ui";

/** Mostra o código SMS quando a API roda em modo local (SMS_PROVIDER=console). Nunca aparece com a Twilio. */
export function DevCodeNotice({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <Alert tone="warning">
      Ambiente local: o SMS não é enviado de verdade. Seu código é <strong className="font-mono tracking-widest">{code}</strong>
    </Alert>
  );
}
