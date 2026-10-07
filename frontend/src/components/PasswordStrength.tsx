import clsx from "clsx";
import { Check, X } from "lucide-react";

/** Requisitos de senha forte. Os mesmos são validados pela API no cadastro. */
export const PASSWORD_RULES = [
  { label: "Pelo menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Uma letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Uma letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Um número", test: (value: string) => /\d/.test(value) },
  { label: "Um caractere especial (! @ # $ % ...)", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export const isStrongPassword = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));

const LEVELS = [
  { label: "Muito fraca", bars: 1, color: "bg-red-500", text: "text-red-600" },
  { label: "Fraca", bars: 1, color: "bg-red-500", text: "text-red-600" },
  { label: "Média", bars: 2, color: "bg-amber-400", text: "text-amber-600" },
  { label: "Forte", bars: 3, color: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Muito forte", bars: 4, color: "bg-emerald-600", text: "text-emerald-700" },
];

/** 0–4: quantos requisitos foram cumpridos, com bônus para senhas longas (12+). */
function strengthLevel(value: string) {
  const met = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  if (met === PASSWORD_RULES.length) return value.length >= 12 ? 4 : 3;
  if (met >= 3) return 2;
  return met >= 2 ? 1 : 0;
}

/** Medidor de força da senha (barras vermelho → amarelo → verde) com a lista de requisitos. */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const level = LEVELS[strengthLevel(value)];

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={clsx("h-1.5 flex-1 rounded-full transition-colors", bar <= level.bars ? level.color : "bg-slate-200")}
            />
          ))}
        </div>
        <span className={clsx("w-20 text-right text-xs font-medium", level.text)}>{level.label}</span>
      </div>
      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.label} className={clsx("flex items-center gap-1.5", ok ? "text-emerald-600" : "text-slate-500")}>
              {ok ? <Check className="size-3.5 shrink-0" aria-hidden /> : <X className="size-3.5 shrink-0" aria-hidden />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
