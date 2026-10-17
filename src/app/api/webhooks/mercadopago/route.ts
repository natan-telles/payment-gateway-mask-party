import { NextRequest } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { handlePaymentWebhook } from '@/lib/payments/webhook';

// Webhook do Mercado Pago (evento "Order"), configurado no painel:
// Suas integrações > Webhooks > https://<domínio>/api/webhooks/mercadopago?token=<PAYMENT_WEBHOOK_TOKEN>
export async function POST(req: NextRequest) {
  return handlePaymentWebhook(req, getPaymentProvider('mercadopago'));
}
