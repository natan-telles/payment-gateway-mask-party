import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendReminderEmail } from '@/lib/notifications/email';
import { logNotification } from '@/lib/notifications/log';
import { getResendUsage, emailsRemaining, describeUsage } from '@/lib/notifications/usage';
import { getLeadsLotLabels } from '@/lib/lots/server';
import { DEFAULT_LOT } from '@/lib/lots/labels';

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

    // TRAVA DE COTA: lembretes competem com os e-mails de ingresso, então
    // só metade da cota restante é usada aqui.
    const usage = await getResendUsage();
    const remaining = emailsRemaining(usage);
    const usageSummary = describeUsage(usage);
    const warnings: string[] = [];
    let targets = leads;

    if (remaining !== null) {
      const allowed = Math.floor(remaining / 2);
      if (allowed <= 0) {
        await logNotification({
          level: 'warn',
          kind: 'batch',
          message: `Lembretes bloqueados pela trava de cota. Pendentes: ${leads.length}. ${usageSummary}`,
          errorCode: 'quota_guard',
          meta: { pending: leads.length, remaining },
        });
        return NextResponse.json(
          { success: false, error: `Cota do Resend insuficiente para lembretes (${usageSummary}). Nenhum e-mail foi disparado.`, usage: usageSummary },
          { status: 429 }
        );
      }
      if (allowed < leads.length) {
        targets = leads.slice(0, allowed);
        warnings.push(`Lembretes limitados a ${allowed} de ${leads.length} pendentes pela cota (${usageSummary}).`);
      }
    } else if (!usage.available) {
      warnings.push(`Não foi possível consultar a cota do Resend (${usage.reason}). Lembretes seguem sem trava.`);
    }

    const appUrl = getAppUrl(req.nextUrl.origin);
    // Cada lembrete cita o lote da própria pessoa (reserva válida ou, sem reserva, o vigente)
    const lots = await getLeadsLotLabels(targets.map((lead) => lead.id)).catch(() => new Map());
    let remindedCount = 0;
    let failedCount = 0;
    let quotaHit = false;

    for (const lead of targets) {
      if (quotaHit) break;

      const paymentUrl = `${appUrl}/checkout/${lead.id}`;
      const res = await sendReminderEmail({
        to: lead.email,
        name: lead.name,
        queuePosition: lead.queue_position,
        paymentUrl,
        lotName: (lots.get(lead.id) ?? DEFAULT_LOT).name,
        leadId: lead.id,
      });

      if (res.success) {
        remindedCount += 1;
      } else {
        failedCount += 1;
        if (res.quotaExceeded) quotaHit = true;
      }
    }

    if (quotaHit) warnings.push('A cota do Resend esgotou durante o envio dos lembretes.');
    else if (failedCount > 0) warnings.push(`${failedCount} lembrete(s) falharam. Veja a aba Logs.`);

    await logNotification({
      level: quotaHit || failedCount > 0 ? 'warn' : 'info',
      kind: 'batch',
      message: `Lembretes: ${remindedCount} enviado(s), ${failedCount} falha(s) de ${leads.length} pendente(s). Cota: ${usageSummary}`,
      errorCode: quotaHit ? 'daily_quota_exceeded' : null,
      meta: { totalPending: leads.length, attempted: targets.length, remainingBefore: remaining },
    });

    return NextResponse.json({
      success: true,
      remindedCount,
      failedCount,
      quotaHit,
      totalPending: leads.length,
      warnings,
      usage: usageSummary,
    });
  } catch (err: any) {
    await logNotification({
      level: 'error',
      kind: 'batch',
      message: `Erro inesperado ao enviar lembretes: ${err?.message || 'desconhecido'}`,
      errorCode: 'exception',
    });
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao enviar lembretes' },
      { status: 500 }
    );
  }
}
