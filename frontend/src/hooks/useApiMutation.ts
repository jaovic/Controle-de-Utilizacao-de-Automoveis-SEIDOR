"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { errorMessage } from "@/lib/api";

/**
 * Mutation com o comportamento padrão das telas: invalida as listas afetadas,
 * mostra um toast de sucesso e exibe a mensagem de erro da API (409, 403, 429...).
 */
export function useApiMutation<TVariables, TResult = unknown>({
  mutationFn,
  invalidate,
  successMessage,
  onSuccess,
}: {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  invalidate: QueryKey[];
  successMessage: string;
  onSuccess?: (result: TResult) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      toast.success(successMessage);
      onSuccess?.(result);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
