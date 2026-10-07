"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { isStrongPassword, PasswordStrength } from "@/components/PasswordStrength";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Session } from "@/lib/types";

// Mesmas regras da API, para dar retorno imediato no formulário.
const schema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome"),
    email: z.string().email("Informe um e-mail válido"),
    password: z.string().refine(isStrongPassword, "Use uma senha forte: cumpra todos os requisitos abaixo"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: { password: "" } });
  const password = useWatch({ control, name: "password" }) ?? "";

  async function onSubmit({ name, email, password }: FormOutput) {
    setError(null);
    try {
      // O cadastro já devolve a sessão (cookies): segue direto para o sistema.
      await api<Session>("/auth/register", { method: "POST", body: { name, email, password } });
      router.replace("/usages");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-500">Preencha seus dados para acessar o controle da frota.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Nome" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" {...register("name")} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Senha" htmlFor="password" error={errors.password?.message} hint={password ? undefined : "Use uma senha forte"}>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <PasswordStrength value={password} />
        <Field label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
