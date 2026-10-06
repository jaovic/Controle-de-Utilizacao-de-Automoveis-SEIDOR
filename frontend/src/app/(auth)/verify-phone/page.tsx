"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DevCodeNotice } from "@/components/DevCodeNotice";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pendingAuth, useDevCode } from "@/lib/pendingAuth";

/** Verificação obrigatória do telefone após o cadastro (antes do primeiro login). */
export default function VerifyPhonePage() {
  const router = useRouter();
  const toast = useToast();
  const email = useSearchParams().get("email") ?? "";
  const storedDevCode = useDevCode();
  const [resentDevCode, setResentDevCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!email) {
    return (
      <Card className="space-y-4 p-6">
        <Alert tone="warning">Link de verificação inválido.</Alert>
        <Link href="/login" className="block text-center text-sm font-medium text-brand-700 hover:underline">
          Ir para o login
        </Link>
      </Card>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("O código tem 6 dígitos");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api("/auth/verify-phone", { method: "POST", body: { email, code } });
      pendingAuth.setDevCode(null);
      toast.success("Telefone verificado! Agora é só entrar.");
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setResending(true);
    try {
      const result = await api<{ message: string; devCode?: string }>("/auth/resend-code", { method: "POST", body: { email } });
      setResentDevCode(result.devCode);
      pendingAuth.setDevCode(result.devCode);
      toast.success("Enviamos um novo código.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Confirme seu telefone</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enviamos um código de 6 dígitos por SMS para o celular cadastrado em <strong>{email}</strong>.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <DevCodeNotice code={resentDevCode ?? storedDevCode} />
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
          Confirmar telefone
        </Button>
        <Button type="button" variant="ghost" className="w-full" loading={resending} onClick={resend}>
          Reenviar código
        </Button>
      </form>
    </Card>
  );
}
