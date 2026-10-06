"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Field, Input, Modal, PageHeader } from "@/components/ui";
import { ME_QUERY_KEY, useMe } from "@/hooks/useMe";
import { api, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user } = useMe();
  const [confirming, setConfirming] = useState(false);

  if (!user) return null;

  const rows = [
    ["Nome", user.name],
    ["E-mail", user.email],
    ["Celular", user.phone],
    ["Perfil", user.role === "ADMIN" ? "Administrador" : "Usuário"],
  ];

  return (
    <>
      <PageHeader title="Meu perfil" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">Dados da conta</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Verificação em duas etapas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Quando ativada, todo login pede também um código enviado por SMS para {user.phone}.
              </p>
            </div>
            {user.twoFactorEnabled ? <Badge tone="green">Ativada</Badge> : <Badge>Desativada</Badge>}
          </div>
          <Button className="mt-6" variant={user.twoFactorEnabled ? "secondary" : "primary"} onClick={() => setConfirming(true)}>
            {user.twoFactorEnabled ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
            {user.twoFactorEnabled ? "Desativar" : "Ativar"} verificação em duas etapas
          </Button>
        </Card>
      </div>

      {confirming && <TwoFactorModal enable={!user.twoFactorEnabled} onClose={() => setConfirming(false)} />}
    </>
  );
}

/** Confirma a alteração do 2FA pedindo a senha atual. */
function TwoFactorModal({ enable, onClose }: { enable: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await api<User>("/auth/me/two-factor", { method: "PATCH", body: { enabled: enable, password } });
      queryClient.setQueryData(ME_QUERY_KEY, user);
      toast.success(enable ? "Verificação em duas etapas ativada." : "Verificação em duas etapas desativada.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Modal open title={enable ? "Ativar verificação em duas etapas" : "Desativar verificação em duas etapas"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Confirme sua senha" htmlFor="current-password" error={error ?? undefined}>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
