import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendQueueReleaseEmail } from '@/lib/notifications/email';

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
    const { count = 10, expirationHours = 12 } = await req.json();
    const batchSize = Math.max(1, Math.min(Number(count) || 10, 100));

    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref');

    if (!hasSupabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase não está configurado.' },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    // 1. Buscar os próximos leads pendentes ordenados estritamente por ordem de chegada (queue_position)
    const { data: leads, error: fetchError } = await supabase
      .from('waiting_queue')
      .select('id, name, email, phone, queue_position')
      .eq('notification_status', 'pending')
      .order('queue_position', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum participante pendente de notificação na fila.',
        releasedCount: 0,
      });
    }

    const appUrl = getAppUrl(req.nextUrl.origin);
    const results = [];
    const idsToUpdate: string[] = [];

    // 2. Disparar e-mail de liberação para cada participante
    for (const lead of leads) {
      const paymentUrl = `${appUrl}/checkout/${lead.id}`;
      const emailRes = await sendQueueReleaseEmail({
        to: lead.email,
        name: lead.name,
        queuePosition: lead.queue_position,
        paymentUrl,
        expirationHours,
      });

      results.push({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        queuePosition: lead.queue_position,
        success: emailRes.success,
        simulated: emailRes.simulated,
      });

      if (emailRes.success) {
        idsToUpdate.push(lead.id);
      }
    }

    // 3. Atualizar no banco os leads notificados com carimbo de data
    if (idsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('waiting_queue')
        .update({
          notification_status: 'sent',
          notification_date: new Date().toISOString(),
          payment_deadline: new Date(Date.now() + (Number(expirationHours) || 12) * 60 * 60 * 1000).toISOString(),
        })
        .in('id', idsToUpdate);

      if (updateError) {
        console.error('Erro ao atualizar status de notificação no banco:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      releasedCount: idsToUpdate.length,
      simulated: results[0]?.simulated ?? false,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao processar liberação de lote' },
      { status: 500 }
    );
  }
}
