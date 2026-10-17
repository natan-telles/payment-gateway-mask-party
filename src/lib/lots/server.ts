import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';
import { TicketLot } from '@/types/database';
import { DEFAULT_LOT, LotLabels, lotLabels } from './labels';

// Lote vigente segundo o banco (current_ticket_lot), ou o padrão se não houver
export async function getCurrentLotLabels(): Promise<LotLabels> {
  if (!isSupabaseConfigured()) return DEFAULT_LOT;

  const { data, error } = await createAdminClient().rpc('current_ticket_lot').maybeSingle<TicketLot>();
  if (error) throw new Error(error.message);

  return data ? lotLabels(data.sort_order) : DEFAULT_LOT;
}

// Lote de um pedido específico (o ingresso pago fica com o lote em que foi comprado)
export async function getOrderLotLabels(orderId: string): Promise<LotLabels> {
  const { data, error } = await createAdminClient()
    .from('payment_orders')
    .select('ticket_lots(sort_order)')
    .eq('id', orderId)
    .maybeSingle<{ ticket_lots: { sort_order: number } | null }>();

  if (error) throw new Error(error.message);

  return data?.ticket_lots ? lotLabels(data.ticket_lots.sort_order) : DEFAULT_LOT;
}

// Lote de cada lead: o da reserva ainda válida (é o que ele vai pagar) ou, sem reserva,
// o vigente (o checkout reserva no lote vigente). Usado nos lembretes de pagamento.
export async function getLeadsLotLabels(leadIds: string[]): Promise<Map<string, LotLabels>> {
  const fallback = await getCurrentLotLabels().catch(() => DEFAULT_LOT);
  const result = new Map(leadIds.map((id) => [id, fallback]));
  if (leadIds.length === 0) return result;

  const { data, error } = await createAdminClient()
    .from('payment_orders')
    .select('lead_id, ticket_lots(sort_order)')
    .in('lead_id', leadIds)
    .eq('status', 'reserved')
    .gt('reserved_until', new Date().toISOString())
    .returns<{ lead_id: string; ticket_lots: { sort_order: number } | null }[]>();

  if (error) throw new Error(error.message);

  for (const order of data ?? []) {
    if (order.ticket_lots) result.set(order.lead_id, lotLabels(order.ticket_lots.sort_order));
  }

  return result;
}
