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
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const pad = (value: number) => String(value).padStart(2, "0");

/** Arredonda para baixo no múltiplo de 5 minutos (os minutos são escolhidos de 5 em 5). */
export function roundDownTo5Minutes(date: Date) {
  const rounded = new Date(date);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 5) * 5, 0, 0);
  return rounded;
}

/**
 * Data em um calendário (popover) e hora em dois selects (hora / minuto), em vez do
 * <input type="datetime-local"> nativo, que é difícil de usar e muda conforme o navegador.
 */
export function DateTimePicker({
  value,
  onChange,
  maxDate,
  idPrefix,
}: {
  value: Date;
  onChange: (value: Date) => void;
  /** dias depois desta data ficam desabilitados no calendário */
  maxDate?: Date;
  idPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    onChange(next);
  };

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
              disabled={maxDate ? { after: maxDate } : undefined}
              endMonth={maxDate}
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
        <Select
          aria-label="Hora"
          className="w-[4.5rem]"
          value={value.getHours()}
          onChange={(event) => update({ hour: Number(event.target.value) })}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
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
            <option key={minute} value={minute}>
              {pad(minute)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
