export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
  /**
   * true apenas no provider de desenvolvimento: permite devolver o código na resposta da API
   * para testar localmente sem enviar SMS de verdade.
   */
  readonly exposesCodes: boolean;
}
