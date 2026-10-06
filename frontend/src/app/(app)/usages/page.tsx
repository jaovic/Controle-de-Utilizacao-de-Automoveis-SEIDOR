"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Badge, Button, ConfirmModal, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { useApiMutation } from "@/hooks/useApiMutation";
import { api } from "@/lib/api";
import { formatDateTime, localInputToIso } from "@/lib/format";
import type { Car, Driver, Usage } from "@/lib/types";

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "true", label: "Em andamento" },
  { value: "false", label: "Finalizadas" },
];

export default function UsagesPage() {
  const [active, setActive] = useState("");
  const [creating, setCreating] = useState(false);
  const [finishing, setFinishing] = useState<Usage | null>(null);

  const usages = useQuery({
    queryKey: ["usages", active],
    queryFn: () => api<Usage[]>(`/usages${active ? `?active=${active}` : ""}`),
  });

  const finish = useApiMutation({
    mutationFn: (usage: Usage) => api(`/usages/${usage.id}/finish`, { method: "PATCH", body: {} }),
    invalidate: [["usages"]],
    successMessage: "Utilização finalizada.",
    onSuccess: () => setFinishing(null),
  });

  return (
    <>
      <PageHeader
        title="Utilizações"
        description="Quem está com cada automóvel. Um carro só pode estar com um motorista por vez, e vice-versa."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nova utilização
          </Button>
        }
      />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            role="tab"
            aria-selected={active === filter.value}
            onClick={() => setActive(filter.value)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              active === filter.value ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {usages.isLoading ? (
        <Spinner />
      ) : usages.isError ? (
        <Alert tone="error">Não foi possível carregar as utilizações.</Alert>
      ) : (
        <Table headers={["Motorista", "Automóvel", "Motivo", "Início", "Término", ""]} empty={usages.data?.length === 0}>
          {usages.data?.map((usage) => (
            <tr key={usage.id}>
              <Td className="font-medium text-slate-900">{usage.driver.name}</Td>
              <Td>
                <span className="font-mono font-medium text-slate-900">{usage.car.plate}</span>
                <span className="block text-xs text-slate-500">
                  {usage.car.brand} · {usage.car.color}
                </span>
              </Td>
              <Td className="max-w-64 truncate" >{usage.reason}</Td>
              <Td className="whitespace-nowrap">{formatDateTime(usage.startedAt)}</Td>
              <Td className="whitespace-nowrap">
                {usage.endedAt ? formatDateTime(usage.endedAt) : <Badge tone="green">Em andamento</Badge>}
              </Td>
              <Td className="text-right">
                {!usage.endedAt && (
                  <Button size="sm" variant="secondary" onClick={() => setFinishing(usage)}>
                    Finalizar
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {creating && <StartUsageModal onClose={() => setCreating(false)} />}

      <ConfirmModal
        open={finishing !== null}
        title="Finalizar utilização"
        message={`Registrar agora a devolução do automóvel ${finishing?.car.plate} por ${finishing?.driver.name}?`}
        confirmLabel="Finalizar"
        loading={finish.isPending}
        onConfirm={() => finishing && finish.mutate(finishing)}
        onClose={() => setFinishing(null)}
      />
    </>
  );
}

const startSchema = z.object({
  carId: z.string().min(1, "Selecione o automóvel"),
  driverId: z.string().min(1, "Selecione o motorista"),
  reason: z.string().trim().min(1, "Informe o motivo"),
  startedAt: z.string().optional(),
});
type StartForm = z.infer<typeof startSchema>;

function StartUsageModal({ onClose }: { onClose: () => void }) {
  const cars = useQuery({ queryKey: ["cars", {}], queryFn: () => api<Car[]>("/cars") });
  const drivers = useQuery({ queryKey: ["drivers", ""], queryFn: () => api<Driver[]>("/drivers") });
  // Mostra quem já está em uso para evitar o 409 antes mesmo de enviar.
  const activeUsages = useQuery({ queryKey: ["usages", "true"], queryFn: () => api<Usage[]>("/usages?active=true") });
  const busyCars = new Set(activeUsages.data?.map((usage) => usage.carId));
  const busyDrivers = new Set(activeUsages.data?.map((usage) => usage.driverId));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StartForm>({ resolver: zodResolver(startSchema) });

  const start = useApiMutation({
    mutationFn: ({ startedAt, ...data }: StartForm) =>
      api("/usages", { method: "POST", body: { ...data, startedAt: localInputToIso(startedAt) } }),
    invalidate: [["usages"]],
    successMessage: "Utilização iniciada.",
    onSuccess: onClose,
  });

  const loading = cars.isLoading || drivers.isLoading || activeUsages.isLoading;

  return (
    <Modal open title="Nova utilização" onClose={onClose}>
      {loading ? (
        <Spinner />
      ) : (
        <form onSubmit={handleSubmit((data) => start.mutate(data))} className="space-y-4" noValidate>
          <Field label="Automóvel" htmlFor="carId" error={errors.carId?.message}>
            <Select id="carId" defaultValue="" {...register("carId")}>
              <option value="" disabled>
                Selecione...
              </option>
              {cars.data?.map((car) => (
                <option key={car.id} value={car.id} disabled={busyCars.has(car.id)}>
                  {car.plate} · {car.brand} {car.color}
                  {busyCars.has(car.id) ? " (em uso)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Motorista" htmlFor="driverId" error={errors.driverId?.message}>
            <Select id="driverId" defaultValue="" {...register("driverId")}>
              <option value="" disabled>
                Selecione...
              </option>
              {drivers.data?.map((driver) => (
                <option key={driver.id} value={driver.id} disabled={busyDrivers.has(driver.id)}>
                  {driver.name}
                  {busyDrivers.has(driver.id) ? " (com outro automóvel)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Motivo" htmlFor="reason" error={errors.reason?.message}>
            <Textarea id="reason" placeholder="Ex.: visita a cliente" {...register("reason")} />
          </Field>
          <Field label="Início" htmlFor="startedAt" hint="Opcional. Se vazio, usa o horário atual.">
            <Input id="startedAt" type="datetime-local" {...register("startedAt")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={start.isPending}>
              Iniciar utilização
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
