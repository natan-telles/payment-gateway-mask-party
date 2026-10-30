import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';
import { sendTicketEmail } from '@/lib/notifications/email';
import { logNotification } from '@/lib/notifications/log';
import { buildTicketPdfAttachment } from '@/lib/tickets/pdf';
import { TICKET_KINDS } from '@/lib/tickets/kinds';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

interface IssueResult {
  success: boolean;
  error?: string;
  already_issued?: boolean;
  reused_lead?: boolean;
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  queue_position: number;
  ticket_code: string;
  ticket_kind: 'paid' | 'courtesy' | 'volunteer';
}

// Lista as cortesias emitidas (mais recentes primeiro)
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
  }

  const { data, error } = await createAdminClient()
    .from('waiting_queue')
    .select('id, name, email, phone, ticket_code, ticket_kind, courtesy_note, payment_date, checkin_status, checkin_at, ticket_status')
    .in('ticket_kind', ['courtesy', 'volunteer'])
    .order('payment_date', { ascending: false });

  if (error) {
    const hint = /ticket_kind/.test(error.message) ? ' Rode a seção 7 do supabase/schema.sql no Supabase.' : '';
    return NextResponse.json({ success: false, error: error.message + hint }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

/**
 * Emite um ingresso cortesia (só o admin).
 * Body: { name, phone, email, note?, sendEmail? }
 * - Gera código BDL-C-XXXXXX via issue_courtesy_ticket (idempotente por telefone/e-mail)
 * - Não cria payment_orders: não ocupa vaga de lote
 * - sendEmail (padrão true): envia o e-mail do ingresso com QR inline + PDF anexo
 */
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
  }

  try {
    const { name, phone, email, note, sendEmail = true, kind = 'courtesy' } = (await req.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      note?: string;
      sendEmail?: boolean;
      kind?: 'courtesy' | 'volunteer';
    };

    const ticketKind: 'courtesy' | 'volunteer' = kind === 'volunteer' ? 'volunteer' : 'courtesy';
    const label = ticketKind === 'volunteer' ? 'voluntário' : 'cortesia';
    const cleanName = (name ?? '').trim();
    const cleanPhone = (phone ?? '').replace(/\D/g, '');
    const cleanEmail = (email ?? '').trim().toLowerCase();

    // Cortesia: nome + WhatsApp. Voluntário: só o nome (telefone/e-mail opcionais).
    if (!cleanName) {
      return NextResponse.json({ success: false, error: 'Informe o nome.' }, { status: 400 });
    }
    if (ticketKind === 'courtesy' && cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Nome e WhatsApp (com DDD) são obrigatórios para a cortesia.' },
        { status: 400 }
      );
    }
    if (cleanPhone && cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'WhatsApp inválido (use DDD). Deixe em branco para emitir sem telefone.' }, { status: 400 });
    }
    if (cleanEmail && !cleanEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'E-mail inválido. Deixe em branco para emitir sem e-mail.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('issue_courtesy_ticket', {
      p_name: cleanName,
      p_phone: cleanPhone || null,
      p_email: cleanEmail || null,
      p_note: note?.trim() || null,
      p_kind: ticketKind,
    });

    if (error) {
      const hint = /issue_courtesy_ticket|ticket_kind/.test(error.message)
        ? ' Rode a seção 7 do supabase/schema.sql no SQL Editor do Supabase.'
        : '';
      return NextResponse.json({ success: false, error: error.message + hint }, { status: 500 });
    }

    const result = data as IssueResult | null;
    if (!result?.success) {
      return NextResponse.json({ success: false, error: `Não foi possível emitir o ingresso de ${label} (campos obrigatórios).` }, { status: 400 });
    }

    // Já tinha ingresso PAGO: não sobrescrevemos, só avisamos
    if (result.already_issued && result.ticket_kind === 'paid') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: `${result.name} já possui ingresso pago (${result.ticket_code}). Nenhum ingresso de ${label} foi emitido.`,
        ticket: result,
      });
    }

    let emailSent = false;
    let emailError: string | undefined;
    const canEmail = Boolean(result.email);

    if (sendEmail && canEmail) {
      const pdf = await buildTicketPdfAttachment(
        { name: result.name, email: result.email, ticketCode: result.ticket_code, kind: ticketKind, note: note?.trim() || null },
        result.id
      );

      const emailRes = await sendTicketEmail({
        to: result.email as string,
        name: result.name,
        ticketCode: result.ticket_code,
        lotName: TICKET_KINDS[ticketKind].short,
        leadId: result.id,
        kind: ticketKind,
        pdf,
      });
      emailSent = emailRes.success;
      emailError = emailRes.error;
    }

    await logNotification({
      level: 'info',
      kind: 'ticket',
      message: `${TICKET_KINDS[ticketKind].label} ${result.already_issued ? 'reaproveitado' : 'emitido'}: ${result.ticket_code} para ${result.name} (${result.email ?? result.phone ?? 'sem contato'})` +
        (note?.trim() ? ` · ${note.trim()}` : '') +
        (!canEmail ? ' · sem e-mail (entrega por PDF/WhatsApp)' : sendEmail ? (emailSent ? ' · e-mail enviado' : ' · e-mail FALHOU') : ' · e-mail não enviado') + '.',
      leadId: result.id,
      email: result.email,
      meta: { ticketCode: result.ticket_code, kind: ticketKind, reusedLead: result.reused_lead, alreadyIssued: result.already_issued, sendEmail, emailSent },
    });

    return NextResponse.json({
      success: true,
      alreadyIssued: Boolean(result.already_issued),
      reusedLead: Boolean(result.reused_lead),
      emailSent,
      emailError,
      hasEmail: canEmail,
      ticket: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao emitir ingresso';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
