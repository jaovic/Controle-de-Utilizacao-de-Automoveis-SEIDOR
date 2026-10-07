"use client";

import { Card, PageHeader } from "@/components/ui";
import { useMe } from "@/hooks/useMe";
import { formatDateTime } from "@/lib/format";

export default function ProfilePage() {
  const { user } = useMe();

  if (!user) return null;

  const rows = [
    ["Nome", user.name],
    ["E-mail", user.email],
    ["Perfil", user.role === "ADMIN" ? "Administrador" : "Usuário"],
    ["Conta criada em", formatDateTime(user.createdAt)],
  ];

  return (
    <>
      <PageHeader title="Meu perfil" />

      <Card className="max-w-xl p-6">
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
    </>
  );
}
