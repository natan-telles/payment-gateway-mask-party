import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendReminderEmail } from '@/lib/notifications/email';

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
    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref');

    if (!hasSupabase) {
      return NextResponse.json({ success: false, error: 'Supabase não configurado.' }, { status: 500 });
    }

    const supabase = createAdminClient();

    // Busca participantes já notificados que ainda não pagaram
    const { data: leads, error } = await supabase
      .from('waiting_queue')
      .select('id, name, email, phone, queue_position')
      .eq('notification_status', 'sent')
      .eq('payment_status', 'pending');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum participante com pagamento pendente para receber lembrete.',
        remindedCount: 0,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let remindedCount = 0;

    for (const lead of leads) {
      const paymentUrl = `${appUrl}/checkout/${lead.id}`;
      const res = await sendReminderEmail({
        to: lead.email,
        name: lead.name,
        queuePosition: lead.queue_position,
        paymentUrl,
      });

      if (res.success) {
        remindedCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      remindedCount,
      totalPending: leads.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao enviar lembretes' },
      { status: 500 }
    );
  }
}
