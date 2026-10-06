"use client";

import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, ConfirmModal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useMe } from "@/hooks/useMe";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Role, User } from "@/lib/types";

export default function AdminUsersPage() {
  const { user: me, isAdmin } = useMe();
  const [deleting, setDeleting] = useState<User | null>(null);

  const users = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/users"), enabled: isAdmin });

  const changeRole = useApiMutation({
    mutationFn: ({ user, role }: { user: User; role: Role }) => api(`/users/${user.id}/role`, { method: "PATCH", body: { role } }),
    invalidate: [["users"]],
    successMessage: "Role atualizada.",
  });

  const remove = useApiMutation({
    mutationFn: (user: User) => api(`/users/${user.id}`, { method: "DELETE" }),
    invalidate: [["users"]],
    successMessage: "Usuário excluído.",
    onSuccess: () => setDeleting(null),
  });

  // O proxy já barra quem não é ADMIN; isto cobre o caso de a role mudar durante a sessão.
  if (!isAdmin) return <Alert tone="error">Esta área é exclusiva para administradores.</Alert>;

  return (
    <>
      <PageHeader title="Usuários" description="Promova usuários a administrador ou remova contas." />

      {users.isLoading ? (
        <Spinner />
      ) : users.isError ? (
        <Alert tone="error">Não foi possível carregar os usuários.</Alert>
      ) : (
        <Table headers={["Nome", "Contato", "Role", "Segurança", "Criado em", ""]} empty={users.data?.length === 0}>
          {users.data?.map((user) => {
            const isMe = user.id === me?.id;
            return (
              <tr key={user.id}>
                <Td className="font-medium text-slate-900">
                  {user.name} {isMe && <span className="text-xs font-normal text-slate-400">(você)</span>}
                </Td>
                <Td>
                  {user.email}
                  <span className="block text-xs text-slate-500">{user.phone}</span>
                </Td>
                <Td>{user.role === "ADMIN" ? <Badge tone="brand">Admin</Badge> : <Badge>Usuário</Badge>}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {user.phoneVerified ? <Badge tone="green">Telefone verificado</Badge> : <Badge tone="amber">Telefone pendente</Badge>}
                    {user.twoFactorEnabled && <Badge tone="green">2FA</Badge>}
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(user.createdAt)}</Td>
                <Td className="text-right">
                  {!isMe && (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={changeRole.isPending && changeRole.variables?.user.id === user.id}
                        onClick={() => changeRole.mutate({ user, role: user.role === "ADMIN" ? "USER" : "ADMIN" })}
                      >
                        {user.role === "ADMIN" ? "Tornar usuário" : "Tornar admin"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(user)} aria-label={`Excluir ${user.name}`}>
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <ConfirmModal
        open={deleting !== null}
        title="Excluir usuário"
        message={`Excluir a conta de ${deleting?.name} (${deleting?.email})? As sessões dele serão encerradas.`}
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
