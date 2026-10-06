const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value));
