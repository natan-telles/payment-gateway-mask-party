import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendQueueReleaseEmail } from '@/lib/notifications/email';
import { logNotification } from '@/lib/notifications/log';
import { getResendUsage, emailsRemaining, describeUsage } from '@/lib/notifications/usage';
import { getCurrentLotLabels } from '@/lib/lots/server';
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
    const {
      count = 10,
      expirationHours = 12,
      // true = usa toda a cota restante; false (padrão) = guarda metade para os e-mails de ingresso
      ignoreTicketReserve = false,
    } = await req.json();
    const requested = Math.max(1, Math.min(Number(count) || 10, 100));

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

    // 0. TRAVA DE COTA: consulta o uso do Resend antes de disparar qualquer e-mail.
    // Cada pessoa liberada que pagar ainda vai receber o e-mail do ingresso, então,
    // por padrão, só metade da cota restante é usada na liberação.
    const usage = await getResendUsage();
    const remaining = emailsRemaining(usage);
    const usageSummary = describeUsage(usage);
    const warnings: string[] = [];
    let batchSize = requested;

    if (remaining !== null) {
      const allowed = ignoreTicketReserve ? remaining : Math.floor(remaining / 2);

      if (allowed <= 0) {
        const message = ignoreTicketReserve
          ? `Cota do Resend esgotada (${usageSummary}). Nenhum e-mail foi disparado; a fila permanece intacta.`
          : `Cota do Resend insuficiente (${usageSummary}): restam ${remaining} e-mail(s) e cada liberação precisa de margem para o ingresso. Nenhum e-mail foi disparado.`;
        await logNotification({
          level: 'warn',
          kind: 'batch',
          message: `Liberação de lote bloqueada pela trava de cota. Pedido: ${requested}. ${usageSummary}`,
          errorCode: 'quota_guard',
          meta: { requested, remaining, ignoreTicketReserve },
        });
        return NextResponse.json({ success: false, error: message, usage: usageSummary, remaining }, { status: 429 });
      }

      if (allowed < requested) {
        batchSize = allowed;
        warnings.push(
          `Lote reduzido de ${requested} para ${batchSize}: restam ${remaining} e-mail(s) na cota (${usageSummary})` +
            (ignoreTicketReserve ? '.' : ' e metade fica reservada para os e-mails de ingresso.')
        );
      }
    } else if (!usage.available) {
      warnings.push(`Não foi possível consultar a cota do Resend (${usage.reason}). O lote segue sem trava.`);
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
        warnings,
        usage: usageSummary,
      });
    }

    const appUrl = getAppUrl(req.nextUrl.origin);
    // Liberados ainda não têm reserva: o lote deles é o vigente (o checkout reserva nele)
    const lot = await getCurrentLotLabels().catch(() => DEFAULT_LOT);
    const results = [];
    const idsToUpdate: string[] = [];
    let failedCount = 0;
    let quotaHit = false;
    let skippedCount = 0;

    // 2. Disparar e-mail de liberação para cada participante
    for (const lead of leads) {
      if (quotaHit) {
        skippedCount += 1;
        continue;
      }

      const paymentUrl = `${appUrl}/checkout/${lead.id}`;
      const emailRes = await sendQueueReleaseEmail({
        to: lead.email,
        name: lead.name,
        queuePosition: lead.queue_position,
        paymentUrl,
        lotName: lot.name,
        expirationHours,
        leadId: lead.id,
      });

      results.push({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        queuePosition: lead.queue_position,
        success: emailRes.success,
        simulated: emailRes.simulated,
        error: emailRes.error,
      });

      if (emailRes.success) {
        idsToUpdate.push(lead.id);
      } else {
        failedCount += 1;
        // Cota estourou no meio do lote: para na hora, quem não recebeu continua 'pending'
        if (emailRes.quotaExceeded) quotaHit = true;
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
        await logNotification({
          level: 'error',
          kind: 'batch',
          message: `E-mails enviados, mas falhou ao marcar ${idsToUpdate.length} lead(s) como notificado(s): ${updateError.message}`,
          errorCode: 'db_update_failed',
          meta: { ids: idsToUpdate },
        });
      }
    }

    if (quotaHit) {
      warnings.push(
        `A cota do Resend esgotou durante o disparo: ${idsToUpdate.length} liberado(s), ${skippedCount + failedCount} continuam na fila como pendentes.`
      );
    } else if (failedCount > 0) {
      warnings.push(`${failedCount} e-mail(s) falharam e continuam pendentes. Veja a aba Logs.`);
    }

    // 4. Resumo do disparo no log
    await logNotification({
      level: quotaHit || failedCount > 0 ? 'warn' : 'info',
      kind: 'batch',
      message: `Liberação de lote: ${idsToUpdate.length} enviado(s), ${failedCount} falha(s), ${skippedCount} não tentado(s). Pedido: ${requested}, lote: ${batchSize}. Cota: ${usageSummary}`,
      errorCode: quotaHit ? 'daily_quota_exceeded' : null,
      meta: { requested, batchSize, expirationHours, remainingBefore: remaining, ignoreTicketReserve, lot: lot.name },
    });

    return NextResponse.json({
      success: true,
      releasedCount: idsToUpdate.length,
      failedCount,
      skippedCount,
      quotaHit,
      requested,
      batchSize,
      warnings,
      usage: usageSummary,
      simulated: results[0]?.simulated ?? false,
      results,
    });
  } catch (err: any) {
    await logNotification({
      level: 'error',
      kind: 'batch',
      message: `Erro inesperado na liberação de lote: ${err?.message || 'desconhecido'}`,
      errorCode: 'exception',
    });
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao processar liberação de lote' },
      { status: 500 }
    );
  }
}
