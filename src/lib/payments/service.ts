import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/app-url';
import { sendTicketEmail } from '@/lib/notifications/email';
import { logNotification } from '@/lib/notifications/log';
import { buildTicketPdfAttachment } from '@/lib/tickets/pdf';
import { getOrderLotLabels } from '@/lib/lots/server';
import { getPaymentProvider } from '.';
import { PaymentProvider, PaymentReference } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

export function getWebhookUrl(providerName: string, requestOrigin?: string) {
  const url = new URL(`${getAppUrl(requestOrigin)}/api/webhooks/${providerName}`);
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
    leadId: string | null;
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
  if (ref.orderId && !isUuid(ref.orderId)) return { status: 'not_found' };

  const supabase = createAdminClient();

  // Atalho para notificações repetidas: evita consultar o gateway de novo
  if (ref.orderId) {
    const already = await getSettledOrder(ref.orderId);
    if (already) return already;
  }

  const verified = await provider.verifyPayment(ref);
  if (!verified.paid) return { status: 'not_paid' };

  // O pedido vem da resposta do gateway; se a referência também trouxe um, precisam bater
  const orderId = verified.orderId;
  if (!orderId || !isUuid(orderId) || (ref.orderId && ref.orderId !== orderId)) {
    console.error(`[PAGAMENTO] Pagamento ${ref.transactionId} sem pedido correspondente (${orderId}).`);
    return { status: 'not_found' };
  }

  const { data: order, error: orderError } = await supabase
    .from('payment_orders')
    .select('id, amount_cents, lead_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  if (!order) return { status: 'not_found' };

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

  // Ingresso leva o lote em que foi comprado (rótulo pelo sort_order)
  const lot = await getOrderLotLabels(order.id).catch(() => null);

  return {
    status: 'confirmed',
    ticketCode: result.ticket_code,
    issued: {
      leadId: order.lead_id ?? null,
      name: result.lead_name,
      email: result.lead_email,
      lotName: lot?.name ?? result.lot_name,
      receiptUrl: result.receipt_url,
    },
  };
}

async function getSettledOrder(orderId: string): Promise<ConfirmResult | null> {
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('payment_orders')
    .select('lead_id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) return { status: 'not_found' };
  if (order.status !== 'paid' && order.status !== 'duplicate') return null;

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

// Envia o ingresso por e-mail apenas na primeira confirmação
export async function notifyTicketIssued(result: ConfirmResult) {
  if (result.status !== 'confirmed' || !result.issued || !result.ticketCode) return;

  // PDF do ingresso vai em anexo (além do QR inline); se a geração falhar, o e-mail segue sem ele
  const pdf = await buildTicketPdfAttachment(
    { name: result.issued.name, email: result.issued.email, ticketCode: result.ticketCode, kind: 'paid', lotName: result.issued.lotName },
    result.issued.leadId
  );

  const emailRes = await sendTicketEmail({
    to: result.issued.email,
    name: result.issued.name,
    ticketCode: result.ticketCode,
    lotName: result.issued.lotName,
    receiptUrl: result.issued.receiptUrl,
    leadId: result.issued.leadId,
    kind: 'paid',
    pdf,
  });

  if (!emailRes.success) {
    // O ingresso já está emitido no banco; só o e-mail falhou. O admin reenvia pela aba Logs / Reenviar.
    console.error(`[PAGAMENTO] Falha ao enviar ingresso ${result.ticketCode} para ${result.issued.email}`);
    await logNotification({
      level: 'error',
      kind: 'ticket',
      message: `PAGAMENTO CONFIRMADO mas o ingresso ${result.ticketCode} NÃO chegou para ${result.issued.name} (${result.issued.email}). Reenvie manualmente pelo painel.`,
      email: result.issued.email,
      leadId: result.issued.leadId,
      errorCode: emailRes.errorCode ?? 'send_failed',
      meta: { ticketCode: result.ticketCode, quotaExceeded: emailRes.quotaExceeded },
    });
  }
}
