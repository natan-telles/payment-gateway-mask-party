import { createAdminClient } from '@/lib/supabase/admin';
import { sendTicketEmail } from '@/lib/notifications/email';
import { getPaymentProvider } from '.';
import { PaymentProvider, PaymentReference } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function getWebhookUrl(providerName: string) {
  const url = new URL(`${getAppUrl()}/api/webhooks/${providerName}`);
  const token = process.env.PAYMENT_WEBHOOK_TOKEN;
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

export type ConfirmStatus =
  | 'confirmed'          // pagamento verificado agora, ingresso emitido
  | 'already_confirmed'  // notificação repetida
  | 'duplicate'          // lead pagou duas vezes: estornar manualmente
  | 'not_paid'           // gateway ainda não confirma o pagamento
  | 'amount_mismatch'    // valor pago menor que o do pedido
  | 'not_found';

export interface ConfirmResult {
  status: ConfirmStatus;
  ticketCode?: string | null;
  issued?: {
    name: string;
    email: string;
    lotName: string;
    receiptUrl: string | null;
  };
}

// Verifica o pagamento direto no gateway (nunca confia no payload recebido)
// e emite o ingresso de forma atômica e idempotente.
export async function confirmOrderPayment(
  ref: PaymentReference,
  provider: PaymentProvider = getPaymentProvider()
): Promise<ConfirmResult> {
  if (!isUuid(ref.orderId)) return { status: 'not_found' };

  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from('payment_orders')
    .select('id, lead_id, amount_cents, status')
    .eq('id', ref.orderId)
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  if (!order) return { status: 'not_found' };

  if (order.status === 'paid' || order.status === 'duplicate') {
    const { data: lead } = await supabase
      .from('waiting_queue')
      .select('ticket_code')
      .eq('id', order.lead_id)
      .maybeSingle();

    return {
      status: order.status === 'paid' ? 'already_confirmed' : 'duplicate',
      ticketCode: lead?.ticket_code ?? null,
    };
  }

  const verified = await provider.verifyPayment(ref);
  if (!verified.paid) return { status: 'not_paid' };

  if (verified.amountCents < order.amount_cents) {
    console.error(
      `[PAGAMENTO] Valor divergente no pedido ${order.id}: esperado ${order.amount_cents}, recebido ${verified.amountCents}`
    );
    return { status: 'amount_mismatch' };
  }

  const { data, error } = await supabase.rpc('confirm_payment', {
    p_order_id: order.id,
    p_transaction_id: ref.transactionId,
    p_paid_amount_cents: verified.paidAmountCents || verified.amountCents,
    p_capture_method: verified.captureMethod ?? ref.captureMethod,
    p_receipt_url: ref.receiptUrl,
    p_provider_ref: ref.providerRef,
  });

  if (error) throw new Error(error.message);

  const result = data as {
    success: boolean;
    newly_paid?: boolean;
    duplicate?: boolean;
    ticket_code?: string | null;
    lead_name: string;
    lead_email: string;
    lot_name: string;
    receipt_url: string | null;
  } | null;
  if (!result?.success) return { status: 'not_found' };

  if (result.duplicate) {
    console.error(`[PAGAMENTO] Pagamento duplicado no pedido ${order.id}: estornar manualmente.`);
    return { status: 'duplicate', ticketCode: result.ticket_code };
  }

  if (!result.newly_paid) {
    return { status: 'already_confirmed', ticketCode: result.ticket_code };
  }

  return {
    status: 'confirmed',
    ticketCode: result.ticket_code,
    issued: {
      name: result.lead_name,
      email: result.lead_email,
      lotName: result.lot_name,
      receiptUrl: result.receipt_url,
    },
  };
}

// Envia o ingresso por e-mail apenas na primeira confirmação
export async function notifyTicketIssued(result: ConfirmResult) {
  if (result.status !== 'confirmed' || !result.issued || !result.ticketCode) return;

  const emailRes = await sendTicketEmail({
    to: result.issued.email,
    name: result.issued.name,
    ticketCode: result.ticketCode,
    lotName: result.issued.lotName,
    receiptUrl: result.issued.receiptUrl,
  });

  if (!emailRes.success) {
    console.error(`[PAGAMENTO] Falha ao enviar ingresso ${result.ticketCode} para ${result.issued.email}`);
  }
}
