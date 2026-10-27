import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

type CheckinResult = {
  success: boolean;
  status: string;
  error?: string;
  name?: string;
  ticket_code?: string;
  ticket_kind?: 'paid' | 'courtesy';
  checkin_at?: string;
};

// Mantém a portaria funcional durante a implantação em bancos que ainda não
// receberam a função SQL. O filtro checkin_status = false torna a atualização
// atômica: em duas leituras simultâneas, apenas uma consegue marcar a entrada.
async function checkInWithoutRpc(ticketCode: string): Promise<CheckinResult> {
  const supabase = createAdminClient();
  const checkinAt = new Date().toISOString();
  const normalizedCode = ticketCode.trim().toUpperCase();
  const { data: checkedIn, error: updateError } = await supabase
    .from('waiting_queue')
    .update({ checkin_status: true, checkin_at: checkinAt, ticket_status: 'checked_in' })
    .eq('ticket_code', normalizedCode)
    .eq('payment_status', 'approved')
    .eq('ticket_status', 'issued')
    .eq('checkin_status', false)
    .select('name, ticket_code, checkin_at, ticket_kind')
    .maybeSingle();

  if (updateError) throw updateError;
  if (checkedIn) {
    return { success: true, status: 'checked_in', ...checkedIn };
  }

  const { data: ticket, error: lookupError } = await supabase
    .from('waiting_queue')
    .select('name, ticket_code, payment_status, ticket_status, checkin_status, checkin_at, ticket_kind')
    .eq('ticket_code', normalizedCode)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!ticket) return { success: false, status: 'not_found', error: 'Ingresso não encontrado.' };
  if (ticket.checkin_status || ticket.ticket_status === 'checked_in') {
    return {
      success: false,
      status: 'already_checked_in',
      error: 'Este ingresso já foi utilizado.',
      name: ticket.name,
      ticket_code: ticket.ticket_code,
      ticket_kind: ticket.ticket_kind,
      checkin_at: ticket.checkin_at,
    };
  }

  return { success: false, status: 'not_eligible', error: 'Este ingresso não está autorizado para entrada.' };
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { ticketCode } = await req.json();
    if (typeof ticketCode !== 'string' || !ticketCode.trim()) {
      return NextResponse.json({ success: false, error: 'Informe o código do ingresso.' }, { status: 400 });
    }
    if (ticketCode.trim().startsWith('{')) {
      return NextResponse.json(
        { success: false, status: 'pre_sale_qr', error: 'Este QR Code é da pré-venda, não de um ingresso confirmado.' },
        { status: 400 }
      );
    }

    const { data, error } = await createAdminClient().rpc('check_in_ticket', {
      p_ticket_code: ticketCode,
    });

    if (error) {
      // PGRST202: a função ainda não foi exposta pelo banco/PostgREST.
      if (error.code === 'PGRST202' || error.message.includes('check_in_ticket')) {
        const fallbackResult = await checkInWithoutRpc(ticketCode);
        return NextResponse.json(fallbackResult, { status: fallbackResult.success ? 200 : 409 });
      }
      console.error('[CHECK-IN] Falha ao validar ingresso:', error.message);
      return NextResponse.json({ success: false, error: 'Não foi possível validar o ingresso.' }, { status: 500 });
    }

    const result = data as CheckinResult;
    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) {
    console.error('[CHECK-IN] Erro inesperado:', error);
    return NextResponse.json({ success: false, error: 'Dados de check-in inválidos.' }, { status: 400 });
  }
}
