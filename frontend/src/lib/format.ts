const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value));

/** Converte o valor de um <input type="datetime-local"> (hora local) para ISO, ou undefined se vazio. */
export const localInputToIso = (value?: string) => (value ? new Date(value).toISOString() : undefined);
