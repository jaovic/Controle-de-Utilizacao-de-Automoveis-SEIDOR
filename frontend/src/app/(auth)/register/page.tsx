"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pendingAuth } from "@/lib/pendingAuth";
import type { User } from "@/lib/types";

// Mesmas regras da API, para dar retorno imediato no formulário.
const schema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome"),
    email: z.string().email("Informe um e-mail válido"),
    phone: z
      .string()
      .transform((value) => value.replace(/[\s()-]/g, ""))
      .refine((value) => /^\+[1-9]\d{9,14}$/.test(value), "Use o formato internacional, ex.: +5511999998888"),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
      .regex(/\d/, "Inclua ao menos um número"),
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
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) });

  async function onSubmit({ name, email, phone, password }: FormOutput) {
    setError(null);
    try {
      const result = await api<{ user: User; devCode?: string }>("/auth/register", { method: "POST", body: { name, email, phone, password } });
      pendingAuth.setDevCode(result.devCode);
      router.push(`/verify-phone?email=${encodeURIComponent(result.user.email)}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-500">Vamos confirmar seu telefone por SMS antes do primeiro acesso.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Nome" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" {...register("name")} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Celular" htmlFor="phone" error={errors.phone?.message} hint="Com código do país e DDD, ex.: +5511999998888">
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+5511999998888" {...register("phone")} />
        </Field>
        <Field label="Senha" htmlFor="password" error={errors.password?.message} hint="Mínimo 8 caracteres, com letra e número">
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </Field>
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
