"use client";

import clsx from "clsx";
import { DateTimePicker } from "./DateTimePicker";

/**
 * Campo "Agora / Outra data e hora", usado no início e na finalização da utilização.
 * Na maioria das vezes o registro é feito na hora; data e hora só aparecem se o usuário escolher.
 */
export function NowOrDateTimeField({
  label,
  idPrefix,
  isNow,
  onIsNowChange,
  value,
  onChange,
  minDate,
  maxDate,
  error,
}: {
  label: string;
  idPrefix: string;
  isNow: boolean;
  onIsNowChange: (isNow: boolean) => void;
  value: Date;
  onChange: (value: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium text-slate-700">{label}</legend>
      <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1" role="radiogroup" aria-label={label}>
        {[
          { now: true, text: "Agora" },
          { now: false, text: "Outra data e hora" },
        ].map((option) => (
          <button
            key={option.text}
            type="button"
            role="radio"
            aria-checked={isNow === option.now}
            onClick={() => onIsNowChange(option.now)}
            className={clsx(
              "rounded-md py-1.5 text-sm font-medium transition-colors",
              isNow === option.now ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {option.text}
          </button>
        ))}
      </div>
      {!isNow && (
        <>
          <DateTimePicker idPrefix={idPrefix} value={value} onChange={onChange} minDate={minDate} maxDate={maxDate} />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </>
      )}
    </fieldset>
  );
}
