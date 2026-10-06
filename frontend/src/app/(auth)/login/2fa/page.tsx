"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DevCodeNotice } from "@/components/DevCodeNotice";
import { Alert, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { pendingAuth, useDevCode, usePendingChallenge } from "@/lib/pendingAuth";
import type { Session } from "@/lib/types";

/** Segunda etapa do login quando o usuário ativou o código por SMS. */
export default function TwoFactorLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Desafio salvo na etapa anterior (undefined até o navegador ler o sessionStorage).
  const challenge = usePendingChallenge();
  const devCode = useDevCode();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/usages";

  if (challenge === undefined) return <Spinner />;

  if (!challenge) {
    return (
      <Card className="space-y-4 p-6">
        <Alert tone="warning">A verificação expirou. Faça login novamente.</Alert>
        <Link href="/login" className="block text-center text-sm font-medium text-brand-700 hover:underline">
          Voltar ao login
        </Link>
      </Card>
    );
  }

  const { challengeToken } = challenge;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("O código tem 6 dígitos");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api<Session>("/auth/login/verify", { method: "POST", body: { challengeToken, code } });
      pendingAuth.setChallenge(null);
      pendingAuth.setDevCode(null);
      router.replace(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "CHALLENGE_EXPIRED") pendingAuth.setChallenge(null);
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Verificação em duas etapas</h1>
      <p className="mt-1 text-sm text-slate-500">Enviamos um código por SMS para o telefone da conta {challenge.email}.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <DevCodeNotice code={devCode} />
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Código" htmlFor="code" hint="O código expira em 5 minutos.">
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            className="text-center font-mono text-lg tracking-[0.5em]"
            autoFocus
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Verificar e entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Não recebeu?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Fazer login novamente
        </Link>
      </p>
    </Card>
  );
}
