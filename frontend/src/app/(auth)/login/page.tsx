"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Session } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});
type FormData = z.infer<typeof schema>;

/** Só aceita caminhos internos no ?next= (evita redirecionar para outro site). */
const safeNext = (value: string | null) => (value?.startsWith("/") && !value.startsWith("//") ? value : "/usages");

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: searchParams.get("email") ?? "" } });

  const next = safeNext(searchParams.get("next"));

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await api<Session>("/auth/login", { method: "POST", body: data });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">Acesse com seu e-mail e senha.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Não tem conta?{" "}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </Card>
  );
}
