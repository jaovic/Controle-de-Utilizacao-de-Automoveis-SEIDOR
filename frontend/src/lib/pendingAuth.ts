"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Dados temporários entre as etapas de autenticação (cadastro → verificação, login → código 2FA),
 * guardados no sessionStorage da aba. Nada sensível de longo prazo fica aqui.
 */
const CHALLENGE_KEY = "ttp:2fa-challenge";
const DEV_CODE_KEY = "ttp:dev-code";

export type PendingChallenge = { challengeToken: string; email: string };

function readRaw(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === undefined || value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage indisponível (ex.: modo privado restrito): o fluxo segue sem o dado.
  }
}

const parse = <T,>(raw: string | null): T | null => {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const pendingAuth = {
  setChallenge: (challenge: PendingChallenge | null) => write(CHALLENGE_KEY, challenge),
  /** Código exibido apenas em ambiente local (API com SMS_PROVIDER=console). */
  setDevCode: (code: string | undefined | null) => write(DEV_CODE_KEY, code ?? null),
};

const noopSubscribe = () => () => {};

/**
 * Lê um valor do sessionStorage sem divergir entre servidor e navegador:
 * no servidor (e na hidratação) retorna `undefined`, no navegador retorna o valor salvo.
 */
function useSessionValue<T>(key: string) {
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => readRaw(key),
    () => undefined,
  );
  return useMemo(() => (raw === undefined ? undefined : parse<T>(raw)), [raw]);
}

export const usePendingChallenge = () => useSessionValue<PendingChallenge>(CHALLENGE_KEY);
export const useDevCode = () => useSessionValue<string>(DEV_CODE_KEY);
