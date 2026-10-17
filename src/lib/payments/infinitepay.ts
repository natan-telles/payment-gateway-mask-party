import { PaymentProvider, PaymentReference } from './types';

// Documentação: https://www.infinitepay.io/checkout-documentacao
// O webhook da InfinitePay não é assinado, então todo pagamento é confirmado via payment_check.
const apiUrl = process.env.INFINITEPAY_API_URL || 'https://api.checkout.infinitepay.io';

function getHandle() {
  const handle = process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/, '');
  if (!handle) {
    throw new Error('Missing INFINITEPAY_HANDLE environment variable.');
  }
  return handle;
}

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`InfinitePay ${path} respondeu ${res.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`InfinitePay ${path} retornou resposta inválida: ${text.slice(0, 300)}`);
  }
}

function buildReference(fields: {
  orderId: unknown;
  transactionId: unknown;
  providerRef: unknown;
  receiptUrl: unknown;
  captureMethod: unknown;
}): PaymentReference | null {
  const orderId = asString(fields.orderId);
  const transactionId = asString(fields.transactionId);
  const providerRef = asString(fields.providerRef);

  // payment_check exige os três identificadores
  if (!orderId || !transactionId || !providerRef) return null;

  return {
    orderId,
    transactionId,
    providerRef,
    receiptUrl: asString(fields.receiptUrl),
    captureMethod: asString(fields.captureMethod),
  };
}

export const infinitePayProvider: PaymentProvider = {
  name: 'infinitepay',
  retryWebhookWhenNotPaid: true,

  async createCheckout({ orderId, amountCents, description, customer, redirectUrl, webhookUrl }) {
    const data = await post('/links', {
      handle: getHandle(),
      order_nsu: orderId,
      items: [{ quantity: 1, price: amountCents, description }],
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      customer: {
        name: customer.name,
        email: customer.email,
        phone_number: toE164(customer.phone),
      },
    });

    const checkoutUrl = asString(data?.url) || asString(data?.payment_url);
    if (!checkoutUrl) {
      throw new Error(`InfinitePay não retornou o link de pagamento: ${JSON.stringify(data).slice(0, 300)}`);
    }

    return { checkoutUrl, pixCode: null, providerRef: asString(data?.slug) };
  },

  async verifyPayment(ref) {
    const data = await post('/payment_check', {
      handle: getHandle(),
      order_nsu: ref.orderId,
      transaction_nsu: ref.transactionId,
      slug: ref.providerRef,
    });

    return {
      paid: data?.success === true && data?.paid === true,
      // payment_check só confirma quando order_nsu, transaction_nsu e slug batem
      orderId: ref.orderId,
      amountCents: Number(data?.amount) || 0,
      paidAmountCents: Number(data?.paid_amount) || 0,
      captureMethod: asString(data?.capture_method),
    };
  },

  parseWebhook({ body }) {
    if (!body || typeof body !== 'object') return null;
    const payload = body as Record<string, unknown>;
    return buildReference({
      orderId: payload.order_nsu,
      transactionId: payload.transaction_nsu,
      providerRef: payload.invoice_slug,
      receiptUrl: payload.receipt_url,
      captureMethod: payload.capture_method,
    });
  },

  parseReturnParams(params) {
    return buildReference({
      orderId: params.get('order_nsu'),
      transactionId: params.get('transaction_nsu'),
      providerRef: params.get('slug'),
      receiptUrl: params.get('receipt_url'),
      captureMethod: params.get('capture_method'),
    });
  },
};
