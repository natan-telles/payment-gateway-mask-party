import { NextRequest } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { handlePaymentWebhook } from '@/lib/payments/webhook';

// Webhook de pagamento aprovado da InfinitePay (URL enviada em cada link de checkout).
export async function POST(req: NextRequest) {
  return handlePaymentWebhook(req, getPaymentProvider('infinitepay'));
}
