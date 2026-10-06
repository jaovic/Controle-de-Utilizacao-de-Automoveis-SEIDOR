"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, ConfirmModal, Field, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useMe } from "@/hooks/useMe";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Driver } from "@/lib/types";

const schema = z.object({ name: z.string().trim().min(1, "Informe o nome") });
type FormData = z.infer<typeof schema>;

export default function DriversPage() {
  const { isAdmin } = useMe();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [deleting, setDeleting] = useState<Driver | null>(null);

  const drivers = useQuery({
    queryKey: ["drivers", name],
    queryFn: () => api<Driver[]>(`/drivers${name ? `?name=${encodeURIComponent(name)}` : ""}`),
  });

  const remove = useApiMutation({
    mutationFn: (driver: Driver) => api(`/drivers/${driver.id}`, { method: "DELETE" }),
    invalidate: [["drivers"]],
    successMessage: "Motorista excluído.",
    onSuccess: () => setDeleting(null),
  });

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setName(String(new FormData(event.currentTarget).get("name") ?? "").trim());
  }

  return (
    <>
      <PageHeader
        title="Motoristas"
        description="Motoristas que podem utilizar os automóveis."
        actions={
          isAdmin && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Novo motorista
            </Button>
          )
        }
      />

      <form onSubmit={applyFilter} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input name="name" placeholder="Buscar por nome" aria-label="Filtrar por nome" className="sm:max-w-64" />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {!isAdmin && (
        <div className="mb-4">
          <Alert>Somente administradores podem cadastrar, editar ou excluir motoristas.</Alert>
        </div>
      )}

      {drivers.isLoading ? (
        <Spinner />
      ) : drivers.isError ? (
        <Alert tone="error">Não foi possível carregar os motoristas.</Alert>
      ) : (
        <Table headers={["Nome", "Cadastrado em", ...(isAdmin ? [""] : [])]} empty={drivers.data?.length === 0}>
          {drivers.data?.map((driver) => (
            <tr key={driver.id}>
              <Td className="font-medium text-slate-900">{driver.name}</Td>
              <Td>{formatDateTime(driver.createdAt)}</Td>
              {isAdmin && (
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(driver)} aria-label={`Editar ${driver.name}`}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(driver)} aria-label={`Excluir ${driver.name}`}>
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {editing && <DriverFormModal driver={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmModal
        open={deleting !== null}
        title="Excluir motorista"
        message={`Excluir ${deleting?.name}? Motoristas com histórico de utilização não podem ser excluídos.`}
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function DriverFormModal({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: driver?.name ?? "" } });

  const save = useApiMutation({
    mutationFn: (data: FormData) =>
      driver ? api(`/drivers/${driver.id}`, { method: "PUT", body: data }) : api("/drivers", { method: "POST", body: data }),
    invalidate: [["drivers"], ["usages"]],
    successMessage: driver ? "Motorista atualizado." : "Motorista cadastrado.",
    onSuccess: onClose,
  });

  return (
    <Modal open title={driver ? "Editar motorista" : "Novo motorista"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-4" noValidate>
        <Field label="Nome" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoFocus {...register("name")} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
