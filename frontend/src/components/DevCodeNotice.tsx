import { Alert } from "./ui";

/**
 * Mostra o código quando a API não entregou o SMS de verdade: em ambiente local (SMS_PROVIDER=console)
 * ou no modo demonstração (SMS_DEMO_FALLBACK=true), quando a conta de SMS não pode enviar para o número.
 * Quando o SMS é entregue, a API não devolve o código e este aviso não aparece.
 */
export function DevCodeNotice({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <Alert tone="warning">
      Modo demonstração: o SMS não foi enviado para este número. Use o código{" "}
      <strong className="font-mono tracking-widest">{code}</strong>
    </Alert>
  );
}
