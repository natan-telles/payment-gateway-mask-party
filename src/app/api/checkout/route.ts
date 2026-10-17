import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentProvider, isSupabaseConfigured } from '@/lib/payments';
import { getAppUrl, getWebhookUrl, isUuid } from '@/lib/payments/service';

const RESERVATION_MINUTES = 30;

interface ReserveResult {
  success: boolean;
  error?: string;
  reused?: boolean;
  order_id: string;
  lot_name: string;
  amount_cents: number;
  reserved_until: string;
  checkout_url: string | null;
}

const RESERVE_ERRORS: Record<string, { status: number; message: string }> = {
  lead_not_found: { status: 404, message: 'Cadastro não encontrado.' },
  already_paid: { status: 409, message: 'Seu ingresso já está confirmado.' },
  not_released: { status: 403, message: 'Seu lugar na fila ainda não foi liberado para compra.' },
  deadline_passed: { status: 410, message: 'O prazo para pagamento expirou.' },
  sold_out: { status: 409, message: 'Ingressos esgotados no momento.' },
};

// Resumo do checkout para a página /checkout/[leadId]
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead') || '';

  if (!isUuid(leadId)) {
    return NextResponse.json({ success: false, error: 'Link de pagamento inválido.' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
  }

  try {
    const supabase = createAdminClient();

    const { data: lead, error } = await supabase
      .from('waiting_queue')
      .select('id, name, queue_position, notification_status, payment_status, payment_deadline, ticket_code')
      .eq('id', leadId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Cadastro não encontrado.' }, { status: 404 });
    }

    const base = {
      name: lead.name,
      queuePosition: lead.queue_position,
      paymentDeadline: lead.payment_deadline,
    };

    if (lead.payment_status === 'approved') {
      return NextResponse.json({ success: true, data: { ...base, status: 'paid', ticketCode: lead.ticket_code } });
    }

    if (lead.notification_status !== 'sent') {
      return NextResponse.json({ success: true, data: { ...base, status: 'not_released' } });
    }

    if (lead.payment_deadline && new Date(lead.payment_deadline) <= new Date()) {
      return NextResponse.json({ success: true, data: { ...base, status: 'deadline_passed' } });
    }

    // Reserva válida do lead tem prioridade sobre o lote vigente
    const { data: reservation } = await supabase
      .from('payment_orders')
      .select('amount_cents, reserved_until, ticket_lots(name)')
      .eq('lead_id', leadId)
      .eq('status', 'reserved')
      .gt('reserved_until', new Date().toISOString())
      .maybeSingle();

    if (reservation) {
      const lot = reservation.ticket_lots as unknown as { name: string } | null;
      return NextResponse.json({
        success: true,
        data: {
          ...base,
          status: 'available',
          lot: { name: lot?.name ?? '', priceCents: reservation.amount_cents },
          reservedUntil: reservation.reserved_until,
        },
      });
    }

    const { data: lot, error: lotError } = await supabase.rpc('current_ticket_lot').maybeSingle();

    if (lotError) {
      return NextResponse.json({ success: false, error: lotError.message }, { status: 500 });
    }

    if (!lot) {
      return NextResponse.json({ success: true, data: { ...base, status: 'sold_out' } });
    }

    const currentLot = lot as { name: string; price_cents: number };
    return NextResponse.json({
      success: true,
      data: {
        ...base,
        status: 'available',
        lot: { name: currentLot.name, priceCents: currentLot.price_cents },
      },
    });
  } catch (err) {
    console.error('Checkout GET Error:', err);
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 });
  }
}

// Reserva uma vaga no lote vigente por 30 min e gera o link de pagamento no gateway
export async function POST(req: NextRequest) {
  try {
    const { leadId } = (await req.json()) as { leadId?: string };

    if (!leadId || !isUuid(leadId)) {
      return NextResponse.json({ success: false, error: 'Link de pagamento inválido.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
    }

    const provider = getPaymentProvider();
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('reserve_ticket', {
      p_lead_id: leadId,
      p_provider: provider.name,
      p_reservation_minutes: RESERVATION_MINUTES,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const reservation = data as ReserveResult | null;

    if (!reservation?.success) {
      const known = RESERVE_ERRORS[reservation?.error ?? ''] ?? { status: 500, message: 'Não foi possível reservar.' };
      return NextResponse.json(
        { success: false, error: known.message, code: reservation?.error },
        { status: known.status }
      );
    }

    if (reservation.checkout_url) {
      return NextResponse.json({ success: true, data: { checkoutUrl: reservation.checkout_url } });
    }

    if (reservation.reused) {
      // Outra requisição do mesmo lead ainda está gerando o link
      return NextResponse.json(
        { success: false, error: 'Seu link de pagamento está sendo gerado. Tente novamente em instantes.' },
        { status: 409 }
      );
    }

    const { data: lead } = await supabase
      .from('waiting_queue')
      .select('name, email, phone')
      .eq('id', leadId)
      .single();

    try {
      const checkout = await provider.createCheckout({
        orderId: reservation.order_id,
        amountCents: reservation.amount_cents,
        description: `Ingresso Baile da Lagoa · ${reservation.lot_name}`,
        customer: { name: lead!.name, email: lead!.email, phone: lead!.phone },
        redirectUrl: `${getAppUrl()}/pagamento/retorno`,
        webhookUrl: getWebhookUrl(provider.name),
      });

      await supabase
        .from('payment_orders')
        .update({ checkout_url: checkout.checkoutUrl, provider_ref: checkout.providerRef })
        .eq('id', reservation.order_id);

      return NextResponse.json({ success: true, data: { checkoutUrl: checkout.checkoutUrl } });
    } catch (err) {
      // Libera a vaga se o gateway falhar
      await supabase.from('payment_orders').update({ status: 'cancelled' }).eq('id', reservation.order_id);
      console.error('Erro ao criar checkout no gateway:', err);
      return NextResponse.json(
        { success: false, error: 'Não foi possível gerar o pagamento. Tente novamente.' },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('Checkout POST Error:', err);
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 });
  }
}
