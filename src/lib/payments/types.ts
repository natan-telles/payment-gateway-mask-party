// Contrato comum dos gateways de pagamento. Para trocar de gateway (ex: Mercado Pago),
// basta implementar esta interface e registrá-la em ./index.ts.

export interface CreateCheckoutInput {
  orderId: string;
  amountCents: number;
  description: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  redirectUrl: string;
  webhookUrl: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  providerRef: string | null;
}

// Identificação de um pagamento recebida via webhook ou URL de retorno.
// Nunca é confiável por si só: sempre passa por verifyPayment.
export interface PaymentReference {
  orderId: string;
  transactionId: string;
  providerRef: string | null;
  receiptUrl: string | null;
  captureMethod: string | null;
}

export interface VerifiedPayment {
  paid: boolean;
  amountCents: number;
  paidAmountCents: number;
  captureMethod: string | null;
}

export interface PaymentProvider {
  name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyPayment(ref: PaymentReference): Promise<VerifiedPayment>;
  parseWebhook(body: unknown): PaymentReference | null;
  parseReturnParams(params: URLSearchParams): PaymentReference | null;
}
