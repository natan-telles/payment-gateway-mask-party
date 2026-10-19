import { NextRequest, NextResponse } from 'next/server';
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

  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Baile da Lagoa <onboarding@resend.dev>';

  try {
    const { to, templateType = 'confirmation' } = await req.json();

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Informe um endereço de e-mail válido para o teste.' },
        { status: 400 }
      );
    }

    let result;

    if (templateType === 'release') {
      result = await sendQueueReleaseEmail({
        to,
        name: 'Usuário de Teste',
        queuePosition: 16,
        paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?checkout=true`,
        expirationHours: 12,
        lotName: '1º Lote',
      });
    } else if (templateType === 'reminder') {
      result = await sendReminderEmail({
        to,
        name: 'Usuário de Teste',
        queuePosition: 16,
        paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?checkout=true`,
        lotName: '1º Lote',
      });
    } else if (templateType === 'ticket') {
      result = await sendTicketEmail({
        to,
        name: 'Usuário de Teste',
        ticketCode: 'BAILE-0016-TESTE',
        lotName: '1º Lote',
      });
    } else {
      // Padrão: Confirmação de entrada na fila (template revisado antispam)
      result = await sendQueueConfirmationEmail({
        to,
        name: 'Manuella Lima (Teste)',
        queuePosition: 16,
        lotName: '1º Lote',
      });
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Falha ao disparar e-mail via Resend.',
        config: { emailFrom, hasApiKey: Boolean(apiKey) },
      });
    }

    return NextResponse.json({
      success: true,
      message: `E-mail de teste enviado com sucesso para ${to}!`,
      resendId: result.id,
      simulated: result.simulated,
      templateType,
      config: { emailFrom, hasApiKey: Boolean(apiKey) },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro inesperado ao processar o envio de teste.',
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');

  if (!to) {
    return NextResponse.json({
      success: false,
      message: 'Informe o parâmetro ?to=seu_email@dominio.com na URL para testar o envio',
    });
  }

  const result = await sendQueueConfirmationEmail({
    to,
    name: 'Usuário de Teste',
    queuePosition: 16,
    lotName: '1º Lote',
  });

  return NextResponse.json({
    success: result.success,
    resendId: result.id,
    simulated: result.simulated,
    error: result.error,
  });
}


