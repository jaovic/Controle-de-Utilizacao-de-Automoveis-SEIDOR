"use client";

import clsx from "clsx";
import { format } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { Select } from "./ui";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);
const pad = (value: number) => String(value).padStart(2, "0");

/** Zera segundos e milissegundos (os horários são escolhidos minuto a minuto). */
export function startOfMinute(date: Date) {
  const result = new Date(date);
  result.setSeconds(0, 0);
  return result;
}

/** Primeiro minuto cheio igual ou posterior à data (ex.: 22:47:30 → 22:48). */
function ceilToMinute(date: Date) {
  const floor = startOfMinute(date);
  return floor.getTime() === date.getTime() ? floor : new Date(floor.getTime() + 60_000);
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * Data em um calendário (popover) e hora em dois selects (hora / minuto), em vez do
 * <input type="datetime-local"> nativo, que é difícil de usar e muda conforme o navegador.
 * `minDate` e `maxDate` limitam a escolha: dias, horas e minutos fora do intervalo ficam desabilitados.
 */
export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  idPrefix,
}: {
  value: Date;
  onChange: (value: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  idPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const min = minDate ? ceilToMinute(minDate) : undefined;
  const max = maxDate ? startOfMinute(maxDate) : undefined;

  // Fecha o calendário ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const update = (changes: { day?: Date; hour?: number; minute?: number }) => {
    const next = new Date(changes.day ?? value);
    next.setHours(changes.hour ?? value.getHours(), changes.minute ?? value.getMinutes(), 0, 0);
    // Se a combinação escolhida sair do intervalo permitido, ajusta para o limite mais próximo.
    if (max && next > max) onChange(max);
    else if (min && next < min) onChange(min);
    else onChange(next);
  };

  const isMinDay = min !== undefined && sameDay(value, min);
  const isMaxDay = max !== undefined && sameDay(value, max);
  const isHourDisabled = (hour: number) => (isMaxDay && hour > max.getHours()) || (isMinDay && hour < min.getHours());
  const isMinuteDisabled = (minute: number) =>
    (isMaxDay && value.getHours() === max.getHours() && minute > max.getMinutes()) ||
    (isMinDay && value.getHours() === min.getHours() && minute < min.getMinutes());

  const disabledDays = [...(min ? [{ before: startOfDay(min) }] : []), ...(max ? [{ after: max }] : [])];

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={`${idPrefix}-date`}
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={clsx(
            "flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm text-slate-900",
            open ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-300 hover:border-slate-400",
          )}
        >
          <CalendarDays className="size-4 text-slate-400" aria-hidden />
          {format(value, "dd/MM/yyyy")}
          <span className="ml-auto text-xs text-slate-400">{format(value, "EEEE", { locale: ptBR })}</span>
        </button>

        {open && (
          <div role="dialog" aria-label="Escolher data" className="absolute left-0 top-12 z-10 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <DayPicker
              mode="single"
              locale={ptBR}
              required
              selected={value}
              defaultMonth={value}
              disabled={disabledDays}
              startMonth={min}
              endMonth={max}
              onSelect={(day) => {
                if (day) update({ day });
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Clock className="size-4 text-slate-400" aria-hidden />
        <Select aria-label="Hora" className="w-[4.5rem]" value={value.getHours()} onChange={(event) => update({ hour: Number(event.target.value) })}>
          {HOURS.map((hour) => (
            <option key={hour} value={hour} disabled={isHourDisabled(hour)}>
              {pad(hour)}
            </option>
          ))}
        </Select>
        <span className="text-slate-400">:</span>
        <Select
          aria-label="Minuto"
          className="w-[4.5rem]"
          value={value.getMinutes()}
          onChange={(event) => update({ minute: Number(event.target.value) })}
        >
          {MINUTES.map((minute) => (
            <option key={minute} value={minute} disabled={isMinuteDisabled(minute)}>
              {pad(minute)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
