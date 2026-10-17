import { NextRequest, NextResponse, after } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { confirmOrderPayment, notifyTicketIssued } from '@/lib/payments/service';

// Webhook de pagamento aprovado da InfinitePay.
// Respostas 400 fazem a InfinitePay reenviar a notificação; 200 encerra.
// O payload não é assinado: o pagamento é sempre reconfirmado via payment_check.
export async function POST(req: NextRequest) {
  const token = process.env.PAYMENT_WEBHOOK_TOKEN;
  if (token && req.nextUrl.searchParams.get('token') !== token) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 422 });
  }

  const provider = getPaymentProvider('infinitepay');
  const ref = provider.parseWebhook(body);

  if (!ref) {
    return NextResponse.json({ success: false, error: 'invalid_payload' }, { status: 422 });
  }

  try {
    const result = await confirmOrderPayment(ref, provider);

    switch (result.status) {
      case 'not_found':
        console.warn(`[WEBHOOK INFINITEPAY] Pedido inexistente: ${ref.orderId}`);
        return NextResponse.json({ success: false, error: 'order_not_found' }, { status: 404 });
      case 'not_paid':
        // Pode ser atraso de propagação: pede reenvio
        return NextResponse.json({ success: false, error: 'not_paid' }, { status: 400 });
      default:
        after(() => notifyTicketIssued(result));
        return NextResponse.json({ success: true, status: result.status });
    }
  } catch (err) {
    console.error('[WEBHOOK INFINITEPAY] Erro ao processar:', err);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 400 });
  }
}
