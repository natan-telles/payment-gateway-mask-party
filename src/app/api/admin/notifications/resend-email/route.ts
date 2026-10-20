import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendQueueConfirmationEmail,
  sendQueueReleaseEmail,
  sendReminderEmail,
  sendTicketEmail,
} from '@/lib/notifications/email';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { recordId, targetEmail, template } = await req.json();

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'ID do registro é obrigatório.' },
        { status: 400 }
      );
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Informe um e-mail válido.' },
        { status: 400 }
      );
    }

    if (!template || !['confirmation', 'release', 'reminder', 'ticket'].includes(template)) {
      return NextResponse.json(
        { success: false, error: 'Modelo de e-mail inválido.' },
        { status: 400 }
      );
    }

    // Busca o registro no Supabase
    const supabase = createAdminClient();
    const { data: record, error: dbError } = await supabase
      .from('waiting_queue')
      .select('*')
      .eq('id', recordId)
      .single();

    if (dbError || !record) {
      return NextResponse.json(
        { success: false, error: 'Registro não encontrado na fila.' },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${appUrl}/checkout/${record.id}`;
    const lotName = '1º Lote';

    let result;

    switch (template) {
      case 'confirmation':
        result = await sendQueueConfirmationEmail({
          to: targetEmail,
          name: record.name,
          leadId: record.id,
          queuePosition: record.queue_position,
          lotName,
        });
        break;

      case 'release':
        result = await sendQueueReleaseEmail({
          to: targetEmail,
          name: record.name,
          leadId: record.id,
          queuePosition: record.queue_position,
          paymentUrl,
          expirationHours: 12,
          lotName,
        });
        break;

      case 'reminder':
        result = await sendReminderEmail({
          to: targetEmail,
          name: record.name,
          leadId: record.id,
          queuePosition: record.queue_position,
          paymentUrl,
          lotName,
        });
        break;

      case 'ticket':
        result = await sendTicketEmail({
          to: targetEmail,
          name: record.name,
          leadId: record.id,
          ticketCode: record.ticket_code || `MASK-${record.queue_position}`,
          lotName,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Template não reconhecido.' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Falha ao disparar e-mail.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `E-mail de ${template} reenviado para ${targetEmail} (registro: ${record.name}).`,
      resendId: result.id,
      simulated: result.simulated,
      record: {
        id: record.id,
        name: record.name,
        queue_position: record.queue_position,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro inesperado ao processar o reenvio.',
    });
  }
}
