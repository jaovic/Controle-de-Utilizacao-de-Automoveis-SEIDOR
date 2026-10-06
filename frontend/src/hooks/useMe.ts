"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export const ME_QUERY_KEY = ["me"] as const;

/** Usuário autenticado (GET /auth/me). */
export function useMe() {
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: () => api<User>("/auth/me"), staleTime: 60_000 });
  return { ...query, user: query.data, isAdmin: query.data?.role === "ADMIN" };
}
