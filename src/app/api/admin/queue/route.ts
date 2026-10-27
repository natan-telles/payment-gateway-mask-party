import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminAuth } from '@/lib/admin-auth';
import { lotLabels } from '@/lib/lots/labels';
import { logNotification } from '@/lib/notifications/log';

interface OrderRow {
  id: string;
  status: 'reserved' | 'paid' | 'expired' | 'cancelled' | 'duplicate';
  amount_cents: number;
  paid_amount_cents: number | null;
  provider: string;
  receipt_url: string | null;
  transaction_id: string | null;
  capture_method: string | null;
  paid_at: string | null;
  reserved_until: string;
  ticket_lots: { name: string; sort_order: number } | null;
}

interface LeadRow {
  id: string;
  created_at: string;
  queue_position: number;
  notification_status: string;
  payment_status: string;
  payment_deadline: string | null;
  ticket_kind?: string | null;
  checkin_status: boolean;
  source: string | null;
  age: number | null;
  payment_orders?: OrderRow[] | null;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const notificationStatus = searchParams.get('notification_status');
    const paymentStatus = searchParams.get('payment_status');
    const source = searchParams.get('source');
    const checkin = searchParams.get('checkin'); // 'in' | 'out' | null
    const sort = searchParams.get('sort') ?? 'position'; // position | recent | paid_first | deadline

    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref');

    if (!hasSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Supabase não está configurado no servidor.',
      }, { status: 500 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // Traz junto os pedidos de pagamento (lote, valor, comprovante, reserva ativa)
    let query = supabase
      .from('waiting_queue')
      .select(
        '*, payment_orders(id, status, amount_cents, paid_amount_cents, provider, receipt_url, transaction_id, capture_method, paid_at, reserved_until, ticket_lots(name, sort_order))'
      )
      .order('queue_position', { ascending: true });

    if (search) {
      const term = search.replace(/[,()]/g, ' ');
      query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,ticket_code.ilike.%${term}%`);
    }

    if (notificationStatus && notificationStatus !== 'all') {
      query = query.eq('notification_status', notificationStatus);
    }

    if (paymentStatus === 'expired') {
      // "Expirado" na prática = ainda não pagou e o prazo de pagamento venceu.
      // Ninguém grava payment_status = 'expired' automaticamente (só manualmente).
      query = query.or(`payment_status.eq.expired,and(payment_status.eq.pending,payment_deadline.lt.${nowIso})`);
    } else if (paymentStatus === 'pending') {
      // Pendente = ainda dentro do prazo (ou sem prazo)
      query = query.eq('payment_status', 'pending').or(`payment_deadline.is.null,payment_deadline.gte.${nowIso}`);
    } else if (paymentStatus === 'expiring') {
      // Vence nas próximas 2 horas: hora de mandar WhatsApp
      const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      query = query.eq('payment_status', 'pending').gte('payment_deadline', nowIso).lte('payment_deadline', in2h);
    } else if (paymentStatus === 'courtesy') {
      query = query.eq('ticket_kind', 'courtesy');
    } else if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (checkin === 'in') query = query.eq('checkin_status', true);
    else if (checkin === 'out') query = query.eq('checkin_status', false).eq('payment_status', 'approved');

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const nowMs = Date.now();
    const rows = (data ?? []) as LeadRow[];

    // Achata os pedidos em campos prontos para a tela
    const leads = rows.map((row) => {
      const orders = row.payment_orders ?? [];
      const paid = orders.find((o) => o.status === 'paid') ?? null;
      const reservation = orders.find((o) => o.status === 'reserved' && new Date(o.reserved_until).getTime() > nowMs) ?? null;
      const { payment_orders: _orders, ...lead } = row;
      void _orders;
      return {
        ...lead,
        paid_order: paid
          ? {
              id: paid.id,
              lot_name: paid.ticket_lots ? lotLabels(paid.ticket_lots.sort_order).name : null,
              amount_cents: paid.amount_cents,
              paid_amount_cents: paid.paid_amount_cents,
              provider: paid.provider,
              receipt_url: paid.receipt_url,
              transaction_id: paid.transaction_id,
              capture_method: paid.capture_method,
              paid_at: paid.paid_at,
              amount_mismatch: paid.paid_amount_cents !== null && paid.paid_amount_cents < paid.amount_cents,
            }
          : null,
        active_reservation: reservation
          ? {
              lot_name: reservation.ticket_lots ? lotLabels(reservation.ticket_lots.sort_order).name : null,
              amount_cents: reservation.amount_cents,
              reserved_until: reservation.reserved_until,
            }
          : null,
      };
    });

    // Ordenação (a base vem por posição)
    if (sort === 'recent') {
      leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'paid_first') {
      const rank = (l: LeadRow) => (l.payment_status === 'approved' ? 0 : l.notification_status === 'sent' ? 1 : 2);
      leads.sort((a, b) => rank(a) - rank(b) || a.queue_position - b.queue_position);
    } else if (sort === 'deadline') {
      const key = (l: LeadRow) =>
        l.payment_status !== 'approved' && l.payment_deadline ? new Date(l.payment_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      leads.sort((a, b) => key(a) - key(b));
    }

    // Métricas resumidas (sobre o conjunto filtrado)
    const total = leads.length;
    const notifiedCount = leads.filter((l) => l.notification_status === 'sent').length;
    const paidCount = leads.filter((l) => l.payment_status === 'approved' && l.ticket_kind !== 'courtesy').length;
    const courtesyCount = leads.filter((l) => l.ticket_kind === 'courtesy').length;
    const isExpired = (l: { payment_status: string; payment_deadline: string | null }) =>
      l.payment_status === 'expired' ||
      (l.payment_status === 'pending' && Boolean(l.payment_deadline) && new Date(l.payment_deadline as string).getTime() < nowMs);
    const expiredCount = leads.filter(isExpired).length;
    const pendingPaymentCount = leads.filter((l) => l.payment_status === 'pending' && !isExpired(l)).length;
    const checkinCount = leads.filter((l) => l.checkin_status).length;
    const revenueCents = leads.reduce((sum, l) => sum + (l.paid_order ? l.paid_order.paid_amount_cents ?? l.paid_order.amount_cents : 0), 0);
    const activeReservations = leads.filter((l) => l.active_reservation).length;
    const in2h = nowMs + 2 * 60 * 60 * 1000;
    const expiringSoonCount = leads.filter(
      (l) => l.payment_status === 'pending' && l.payment_deadline && new Date(l.payment_deadline).getTime() >= nowMs && new Date(l.payment_deadline).getTime() <= in2h
    ).length;
    const mismatchCount = leads.filter((l) => l.paid_order?.amount_mismatch).length;
    const underageCount = leads.filter((l) => typeof l.age === 'number' && l.age < 18).length;

    // Origens existentes (para o filtro ser dinâmico) — sobre a base inteira, não só o filtro
    const { data: sourceRows } = await supabase.from('waiting_queue').select('source');
    const sources = Array.from(new Set((sourceRows ?? []).map((r) => (r.source || 'direct').toLowerCase()))).sort();

    return NextResponse.json({
      success: true,
      data: leads,
      sources,
      metrics: {
        total,
        notifiedCount,
        paidCount,
        courtesyCount,
        expiredCount,
        pendingPaymentCount,
        checkinCount,
        revenueCents,
        activeReservations,
        expiringSoonCount,
        mismatchCount,
        underageCount,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, notification_status, payment_status, ticket_status, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: current } = await supabase
      .from('waiting_queue')
      .select('name, email, ticket_code, payment_status, ticket_kind')
      .eq('id', id)
      .maybeSingle();

    const updates: Record<string, unknown> = {};
    if (notification_status !== undefined) {
      updates.notification_status = notification_status;
      if (notification_status === 'sent') {
        updates.notification_date = new Date().toISOString();
      }
    }
    if (payment_status !== undefined) {
      updates.payment_status = payment_status;
      if (payment_status === 'approved') {
        updates.payment_date = new Date().toISOString();
        updates.ticket_status = 'issued';
        // Aprovação manual (dinheiro na mão, Pix fora do sistema): código no padrão BDL-M-,
        // para ficar claro na portaria que não veio do gateway. Mantém o código se já existir.
        if (!current?.ticket_code) {
          updates.ticket_code = `BDL-M-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }
        if (current?.ticket_kind !== 'courtesy') updates.ticket_kind = 'paid';
      }
    }
    if (ticket_status !== undefined) updates.ticket_status = ticket_status;
    if (notes !== undefined) updates.notes = typeof notes === 'string' && notes.trim() ? notes.trim() : null;

    const { data, error } = await supabase
      .from('waiting_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (payment_status === 'approved' && current?.payment_status !== 'approved') {
      await logNotification({
        level: 'info',
        kind: 'ticket',
        message: `Pagamento APROVADO MANUALMENTE no painel para ${current?.name ?? id} (${data.ticket_code}).`,
        leadId: id,
        email: current?.email ?? null,
        meta: { manual: true, ticketCode: data.ticket_code },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar registro';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: lead } = await supabase
      .from('waiting_queue')
      .select('payment_status, ticket_code')
      .eq('id', id)
      .maybeSingle();

    // Quem já tem ingresso não é excluído (perderia o histórico de pagamento): cancele o ingresso
    if (lead?.payment_status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Este cadastro já tem ingresso emitido. Em vez de excluir, cancele o ingresso no painel de detalhes.' },
        { status: 409 }
      );
    }

    // Pedidos não pagos (reservas vencidas/canceladas) saem junto para não travar a exclusão
    await supabase.from('payment_orders').delete().eq('lead_id', id).neq('status', 'paid');

    const { error } = await supabase.from('waiting_queue').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Registro removido com sucesso' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao deletar registro';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
