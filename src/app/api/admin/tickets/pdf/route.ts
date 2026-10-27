import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';
import { renderTicketPdf, ticketPdfFilename, getPaidLotName } from '@/lib/tickets/pdf';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

// Download do PDF de um ingresso (pago ou cortesia). Só o admin.
// GET /api/admin/tickets/pdf?code=BDL-XXXXXXXX  ou  ?lead=<uuid>
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim().toUpperCase();
  const leadId = searchParams.get('lead')?.trim();

  if (!code && !leadId) {
    return NextResponse.json({ success: false, error: 'Informe ?code= ou ?lead=.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from('waiting_queue')
    .select('id, name, email, ticket_code, payment_status, ticket_status, ticket_kind, courtesy_note');
  query = code ? query.eq('ticket_code', code) : query.eq('id', leadId!);
  const { data: lead, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  if (!lead || !lead.ticket_code) {
    return NextResponse.json({ success: false, error: 'Ingresso não encontrado.' }, { status: 404 });
  }
  if (lead.payment_status !== 'approved' || lead.ticket_status === 'cancelled') {
    return NextResponse.json({ success: false, error: 'Este cadastro não tem ingresso válido.' }, { status: 409 });
  }

  const kind = (lead.ticket_kind as 'paid' | 'courtesy' | null) ?? 'paid';
  const lotName = kind === 'paid' ? await getPaidLotName(lead.id) : null;

  try {
    const pdf = await renderTicketPdf({
      name: lead.name,
      email: lead.email,
      ticketCode: lead.ticket_code,
      kind,
      lotName,
      note: lead.courtesy_note,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ticketPdfFilename(lead.ticket_code)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[PDF] Falha ao gerar ingresso:', err);
    return NextResponse.json({ success: false, error: 'Não foi possível gerar o PDF.' }, { status: 500 });
  }
}
