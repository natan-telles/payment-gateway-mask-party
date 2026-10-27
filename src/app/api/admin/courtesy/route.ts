import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';
import { sendTicketEmail } from '@/lib/notifications/email';
import { logNotification } from '@/lib/notifications/log';
import { buildTicketPdfAttachment } from '@/lib/tickets/pdf';

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
  email: string;
  phone: string;
  queue_position: number;
  ticket_code: string;
  ticket_kind: 'paid' | 'courtesy';
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
    .select('id, name, email, phone, ticket_code, courtesy_note, payment_date, checkin_status, checkin_at, ticket_status')
    .eq('ticket_kind', 'courtesy')
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
    const { name, phone, email, note, sendEmail = true } = (await req.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      note?: string;
      sendEmail?: boolean;
    };

    const cleanName = (name ?? '').trim();
    const cleanPhone = (phone ?? '').replace(/\D/g, '');
    const cleanEmail = (email ?? '').trim().toLowerCase();

    if (!cleanName || cleanPhone.length < 10 || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Nome, WhatsApp (com DDD) e e-mail válido são obrigatórios para a cortesia.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('issue_courtesy_ticket', {
      p_name: cleanName,
      p_phone: cleanPhone,
      p_email: cleanEmail,
      p_note: note?.trim() || null,
    });

    if (error) {
      const hint = /issue_courtesy_ticket|ticket_kind/.test(error.message)
        ? ' Rode a seção 7 do supabase/schema.sql no SQL Editor do Supabase.'
        : '';
      return NextResponse.json({ success: false, error: error.message + hint }, { status: 500 });
    }

    const result = data as IssueResult | null;
    if (!result?.success) {
      return NextResponse.json({ success: false, error: 'Não foi possível emitir a cortesia (campos obrigatórios).' }, { status: 400 });
    }

    // Já tinha ingresso PAGO: não sobrescrevemos, só avisamos
    if (result.already_issued && result.ticket_kind === 'paid') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: `${result.name} já possui ingresso pago (${result.ticket_code}). Nenhuma cortesia foi emitida.`,
        ticket: result,
      });
    }

    let emailSent = false;
    let emailError: string | undefined;

    if (sendEmail) {
      const pdf = await buildTicketPdfAttachment(
        { name: result.name, email: result.email, ticketCode: result.ticket_code, kind: 'courtesy', note: note?.trim() || null },
        result.id
      );

      const emailRes = await sendTicketEmail({
        to: result.email,
        name: result.name,
        ticketCode: result.ticket_code,
        lotName: 'CORTESIA',
        leadId: result.id,
        kind: 'courtesy',
        pdf,
      });
      emailSent = emailRes.success;
      emailError = emailRes.error;
    }

    await logNotification({
      level: 'info',
      kind: 'ticket',
      message: `Cortesia ${result.already_issued ? 'reaproveitada' : 'emitida'}: ${result.ticket_code} para ${result.name} (${result.email})` +
        (note?.trim() ? ` · ${note.trim()}` : '') +
        (sendEmail ? (emailSent ? ' · e-mail enviado' : ' · e-mail FALHOU') : ' · sem e-mail') + '.',
      leadId: result.id,
      email: result.email,
      meta: { ticketCode: result.ticket_code, reusedLead: result.reused_lead, alreadyIssued: result.already_issued, sendEmail, emailSent },
    });

    return NextResponse.json({
      success: true,
      alreadyIssued: Boolean(result.already_issued),
      reusedLead: Boolean(result.reused_lead),
      emailSent,
      emailError,
      ticket: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao emitir cortesia';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
