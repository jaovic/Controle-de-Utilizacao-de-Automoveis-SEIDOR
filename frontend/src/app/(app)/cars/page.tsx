"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, ConfirmModal, Field, Input, Modal, PageHeader, SearchInput, Spinner, Table, Td } from "@/components/ui";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMe } from "@/hooks/useMe";
import { api } from "@/lib/api";
import type { Car } from "@/lib/types";

const schema = z.object({
  plate: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
    .refine((value) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value), "Placa inválida (ABC1234 ou ABC1D23)"),
  color: z.string().trim().min(1, "Informe a cor"),
  brand: z.string().trim().min(1, "Informe a marca"),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function CarsPage() {
  const { isAdmin } = useMe();
  const [filters, setFilters] = useState({ color: "", brand: "" });
  const [editing, setEditing] = useState<Car | "new" | null>(null);
  const [deleting, setDeleting] = useState<Car | null>(null);

  // Filtra enquanto digita: a busca parte de trechos ("pra" encontra "Prata") e só dispara após uma pausa.
  const debouncedFilters = useDebouncedValue(filters);
  const query = new URLSearchParams(
    Object.entries(debouncedFilters)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  ).toString();
  const cars = useQuery({
    queryKey: ["cars", query],
    queryFn: () => api<Car[]>(`/cars${query ? `?${query}` : ""}`),
    placeholderData: keepPreviousData, // mantém a lista anterior na tela enquanto busca a nova
  });

  const remove = useApiMutation({
    mutationFn: (car: Car) => api(`/cars/${car.id}`, { method: "DELETE" }),
    invalidate: [["cars"]],
    successMessage: "Automóvel excluído.",
    onSuccess: () => setDeleting(null),
  });

  return (
    <>
      <PageHeader
        title="Automóveis"
        description="Frota cadastrada. Filtre por cor e marca."
        actions={
          isAdmin && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Novo automóvel
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <SearchInput
          value={filters.color}
          onChange={(color) => setFilters((current) => ({ ...current, color }))}
          placeholder="Filtrar por cor"
        />
        <SearchInput
          value={filters.brand}
          onChange={(brand) => setFilters((current) => ({ ...current, brand }))}
          placeholder="Filtrar por marca"
        />
      </div>

      {!isAdmin && (
        <div className="mb-4">
          <Alert>Somente administradores podem cadastrar, editar ou excluir automóveis.</Alert>
        </div>
      )}

      {cars.isLoading ? (
        <Spinner />
      ) : cars.isError ? (
        <Alert tone="error">Não foi possível carregar os automóveis.</Alert>
      ) : (
        <Table headers={["Placa", "Marca", "Cor", ...(isAdmin ? [""] : [])]} empty={cars.data?.length === 0}>
          {cars.data?.map((car) => (
            <tr key={car.id}>
              <Td className="font-mono font-medium text-slate-900">{car.plate}</Td>
              <Td>{car.brand}</Td>
              <Td>{car.color}</Td>
              {isAdmin && (
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(car)} aria-label={`Editar ${car.plate}`}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(car)} aria-label={`Excluir ${car.plate}`}>
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {editing && <CarFormModal car={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmModal
        open={deleting !== null}
        title="Excluir automóvel"
        message={`Excluir o automóvel ${deleting?.plate}? Automóveis com histórico de utilização não podem ser excluídos.`}
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function CarFormModal({ car, onClose }: { car: Car | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: car ? { plate: car.plate, color: car.color, brand: car.brand } : undefined,
  });

  const save = useApiMutation({
    mutationFn: (data: FormOutput) =>
      car ? api<Car>(`/cars/${car.id}`, { method: "PUT", body: data }) : api<Car>("/cars", { method: "POST", body: data }),
    invalidate: [["cars"], ["usages"]],
    successMessage: car ? "Automóvel atualizado." : "Automóvel cadastrado.",
    onSuccess: onClose,
  });

  return (
    <Modal open title={car ? "Editar automóvel" : "Novo automóvel"} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-4" noValidate>
        <Field label="Placa" htmlFor="plate" error={errors.plate?.message}>
          <Input id="plate" placeholder="ABC1D23" className="font-mono uppercase" {...register("plate")} />
        </Field>
        <Field label="Marca" htmlFor="brand" error={errors.brand?.message}>
          <Input id="brand" {...register("brand")} />
        </Field>
        <Field label="Cor" htmlFor="color" error={errors.color?.message}>
          <Input id="color" {...register("color")} />
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
