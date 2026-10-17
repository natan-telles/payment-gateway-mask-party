import { NextRequest, NextResponse, after } from 'next/server';
import { PaymentProvider } from './types';
import { confirmOrderPayment, notifyTicketIssued } from './service';

// Tratamento comum dos webhooks de pagamento.
// O payload nunca é confiável: o pagamento é sempre reconfirmado na API do gateway.
export async function handlePaymentWebhook(req: NextRequest, provider: PaymentProvider) {
  const tag = `[WEBHOOK ${provider.name}]`;

  const token = process.env.PAYMENT_WEBHOOK_TOKEN;
  if (token && req.nextUrl.searchParams.get('token') !== token) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Alguns gateways enviam os dados só na query string
  }

  const webhookReq = { body, headers: req.headers, searchParams: req.nextUrl.searchParams };

  if (provider.isAuthenticWebhook && !provider.isAuthenticWebhook(webhookReq)) {
    console.warn(`${tag} Assinatura inválida.`);
    return NextResponse.json({ success: false, error: 'invalid_signature' }, { status: 401 });
  }

  const ref = provider.parseWebhook(webhookReq);
  if (!ref) {
    return NextResponse.json({ success: true, status: 'ignored' });
  }

  try {
    const result = await confirmOrderPayment(ref, provider);

    switch (result.status) {
      case 'not_found':
        console.warn(`${tag} Pagamento ${ref.transactionId} sem pedido correspondente.`);
        return NextResponse.json({ success: true, status: 'not_found' });
      case 'not_paid':
        return provider.retryWebhookWhenNotPaid
          ? NextResponse.json({ success: false, error: 'not_paid' }, { status: 400 })
          : NextResponse.json({ success: true, status: 'not_paid' });
      default:
        after(() => notifyTicketIssued(result));
        return NextResponse.json({ success: true, status: result.status });
    }
  } catch (err) {
    console.error(`${tag} Erro ao processar:`, err);
    // 400: a InfinitePay só reenvia em 400; o Mercado Pago reenvia em qualquer não-2xx
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 400 });
  }
}
