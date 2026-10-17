import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider, PaymentReference } from './types';

// Checkout Transparente via API Orders: o Pix (QR + copia-e-cola) é exibido no nosso site.
// Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
// Webhook: configurado no painel (Suas integrações > Webhooks > evento "Order"), assinado com x-signature.
const API_URL = 'https://api.mercadopago.com';

function getAccessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('Missing MERCADO_PAGO_ACCESS_TOKEN environment variable.');
  }
  return token;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toCents(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

async function request(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  const text = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data, text };
}

function firstPayment(order: Record<string, unknown> | null) {
  const transactions = order?.transactions as { payments?: Record<string, unknown>[] } | undefined;
  return transactions?.payments?.[0] ?? null;
}

export const mercadoPagoProvider: PaymentProvider = {
  name: 'mercadopago',
  retryWebhookWhenNotPaid: false,

  async createCheckout({ orderId, amountCents, customer, expiresInMinutes }) {
    const amount = (amountCents / 100).toFixed(2);

    // Credenciais de teste: pagador "APRO" faz o Mercado Pago aprovar o Pix automaticamente
    const payer = process.env.MERCADO_PAGO_TEST_MODE === 'true'
      ? { email: 'test_user_br@testuser.com', first_name: 'APRO' }
      : { email: customer.email, first_name: customer.name.split(' ')[0] };

    const res = await request(
      'POST',
      '/v1/orders',
      {
        type: 'online',
        processing_mode: 'automatic',
        total_amount: amount,
        external_reference: orderId,
        payer,
        transactions: {
          payments: [
            {
              amount,
              payment_method: { id: 'pix', type: 'bank_transfer' },
              // Pix vence junto com a reserva (mínimo aceito pelo Mercado Pago: 30 min)
              expiration_time: `PT${Math.max(30, expiresInMinutes)}M`,
            },
          ],
        },
      },
      // Mesmo pedido nunca gera duas cobranças
      orderId
    );

    if (!res.ok) {
      throw new Error(`Mercado Pago /v1/orders respondeu ${res.status}: ${res.text.slice(0, 500)}`);
    }

    const paymentMethod = firstPayment(res.data)?.payment_method as Record<string, unknown> | undefined;
    const pixCode = asString(paymentMethod?.qr_code);
    const mpOrderId = asString(res.data?.id);

    if (!pixCode || !mpOrderId) {
      throw new Error(`Mercado Pago não retornou o Pix: ${res.text.slice(0, 500)}`);
    }

    return { checkoutUrl: null, pixCode, providerRef: mpOrderId };
  },

  async verifyPayment(ref) {
    const res = await request('GET', `/v1/orders/${encodeURIComponent(ref.transactionId)}`);

    // Ex: notificação de teste do painel com ID inexistente
    if (res.status === 404) {
      return { paid: false, orderId: null, amountCents: 0, paidAmountCents: 0, captureMethod: null };
    }

    if (!res.ok) {
      throw new Error(`Mercado Pago /v1/orders/${ref.transactionId} respondeu ${res.status}: ${res.text.slice(0, 300)}`);
    }

    const order = res.data;
    const payment = firstPayment(order);
    const paid = order?.status === 'processed' && order?.status_detail === 'accredited';

    return {
      paid,
      orderId: asString(order?.external_reference),
      amountCents: paid ? toCents(order?.total_paid_amount ?? payment?.paid_amount ?? order?.total_amount) : 0,
      paidAmountCents: paid ? toCents(order?.total_paid_amount ?? payment?.paid_amount ?? order?.total_amount) : 0,
      captureMethod: asString((payment?.payment_method as Record<string, unknown> | undefined)?.id) ?? 'pix',
    };
  },

  // Assinatura HMAC-SHA256: manifest "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
  isAuthenticWebhook({ headers, searchParams }) {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.warn('[WEBHOOK mercadopago] MERCADO_PAGO_WEBHOOK_SECRET não configurado: assinatura não validada.');
      return true;
    }

    let ts: string | null = null;
    let hash: string | null = null;
    for (const part of (headers.get('x-signature') || '').split(',')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }
    if (!ts || !hash) return false;

    const dataId = (searchParams.get('data.id') || '').toLowerCase();
    const requestId = headers.get('x-request-id') || '';

    const parts: string[] = [];
    if (dataId) parts.push(`id:${dataId}`);
    if (requestId) parts.push(`request-id:${requestId}`);
    parts.push(`ts:${ts}`);
    const manifest = parts.join(';') + ';';

    const computed = createHmac('sha256', secret).update(manifest).digest('hex');
    return computed.length === hash.length && timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  },

  parseWebhook({ body, searchParams }) {
    const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const type = asString(payload.type) ?? searchParams.get('type');
    if (type !== 'order') return null;

    const data = payload.data as Record<string, unknown> | undefined;
    const mpOrderId = asString(data?.id) ?? asString(searchParams.get('data.id'));
    if (!mpOrderId) return null;

    return {
      orderId: asString(data?.external_reference),
      transactionId: mpOrderId,
      providerRef: mpOrderId,
      receiptUrl: null,
      captureMethod: 'pix',
    };
  },

  // Polling da página de checkout: ?order_nsu=<nosso pedido>&payment_id=<order do Mercado Pago>
  parseReturnParams(params): PaymentReference | null {
    const orderId = asString(params.get('order_nsu'));
    const mpOrderId = asString(params.get('payment_id'));
    if (!orderId || !mpOrderId) return null;

    return { orderId, transactionId: mpOrderId, providerRef: mpOrderId, receiptUrl: null, captureMethod: 'pix' };
  },
};
