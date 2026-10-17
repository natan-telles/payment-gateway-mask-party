// Contrato comum dos gateways de pagamento. Para adicionar um gateway,
// basta implementar esta interface e registrá-la em ./index.ts.

export interface CreateCheckoutInput {
  orderId: string;
  amountCents: number;
  description: string;
  expiresInMinutes: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  redirectUrl: string;
  webhookUrl: string;
}

// Checkout hospedado (checkoutUrl) ou Pix direto no site (pixCode)
export interface CreateCheckoutResult {
  checkoutUrl: string | null;
  pixCode: string | null;
  providerRef: string | null;
}

// Identificação de um pagamento recebida via webhook, URL de retorno ou polling.
// Nunca é confiável por si só: sempre passa por verifyPayment.
export interface PaymentReference {
  orderId: string | null; // nosso payment_orders.id, quando o gateway informa
  transactionId: string;
  providerRef: string | null;
  receiptUrl: string | null;
  captureMethod: string | null;
}

// Resultado consultado direto na API do gateway (fonte da verdade)
export interface VerifiedPayment {
  paid: boolean;
  orderId: string | null;
  amountCents: number;
  paidAmountCents: number;
  captureMethod: string | null;
}

export interface WebhookRequest {
  body: unknown;
  headers: Headers;
  searchParams: URLSearchParams;
}

export interface PaymentProvider {
  name: string;
  // InfinitePay só notifica pagamentos aprovados: "não pago" é atraso e pede reenvio.
  // Mercado Pago notifica toda mudança de status: "não pago" é normal.
  retryWebhookWhenNotPaid: boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyPayment(ref: PaymentReference): Promise<VerifiedPayment>;
  isAuthenticWebhook?(req: WebhookRequest): boolean;
  // null = notificação que não é de pagamento (ignorada)
  parseWebhook(req: WebhookRequest): PaymentReference | null;
  parseReturnParams(params: URLSearchParams): PaymentReference | null;
}
