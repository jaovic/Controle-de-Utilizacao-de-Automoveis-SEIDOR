export type SmsSendResult = {
  /**
   * true quando o código pode ser devolvido na resposta da API para aparecer na tela:
   * no provider de desenvolvimento ou no modo demonstração, quando o SMS não pôde ser entregue.
   */
  exposeCode: boolean;
};

export interface SmsProvider {
  send(to: string, message: string): Promise<SmsSendResult>;
}
