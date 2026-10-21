import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/app-url';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';
import { sendQueueReleaseEmail } from '@/lib/notifications/email';
import { logNotification } from '@/lib/notifications/log';
import { getResendUsage, emailsRemaining, describeUsage } from '@/lib/notifications/usage';
import { getLeadsLotLabels } from '@/lib/lots/server';
import { DEFAULT_LOT } from '@/lib/lots/labels';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

/**
 * Dá um novo prazo de pagamento para um ou mais participantes.
 * - payment_deadline = agora + horas
 * - garante notification_status = 'sent' (o checkout exige)
 * - quem estava marcado como 'expired' volta para 'pending'
 * - opcionalmente reenvia o e-mail de liberação com o novo prazo (gasta cota do Resend)
 */
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
  }

  try {
    const { ids, hours = 12, sendEmail = false } = (await req.json()) as {
      ids?: string[];
      hours?: number;
      sendEmail?: boolean;
    };

    const cleanIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id.length > 0) : [];
    if (cleanIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Selecione pelo menos um participante.' }, { status: 400 });
    }

    const safeHours = Math.max(1, Math.min(Number(hours) || 12, 24 * 14));
    const deadline = new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();
    const supabase = createAdminClient();

    const { data: leads, error: fetchError } = await supabase
      .from('waiting_queue')
      .select('id, name, email, queue_position, notification_status, payment_status')
      .in('id', cleanIds);

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    // Quem já pagou não precisa de prazo
    const targets = (leads ?? []).filter((lead) => lead.payment_status !== 'approved');
    const skippedPaid = (leads ?? []).length - targets.length;

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        skippedPaid,
        message: 'Todos os selecionados já estão com pagamento aprovado.',
      });
    }

    const targetIds = targets.map((lead) => lead.id);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('waiting_queue')
      .update({ payment_deadline: deadline, notification_status: 'sent', notification_date: now })
      .in('id', targetIds);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 'expired' volta a 'pending' para a pessoa poder pagar de novo
    const expiredIds = targets.filter((lead) => lead.payment_status === 'expired').map((lead) => lead.id);
    if (expiredIds.length > 0) {
      await supabase.from('waiting_queue').update({ payment_status: 'pending' }).in('id', expiredIds);
    }

    const warnings: string[] = [];
    let emailedCount = 0;
    let emailFailed = 0;

    if (sendEmail) {
      const usage = await getResendUsage();
      const remaining = emailsRemaining(usage);
      const usageSummary = describeUsage(usage);
      let emailTargets = targets;

      if (remaining !== null) {
        const allowed = Math.floor(remaining / 2);
        if (allowed <= 0) {
          warnings.push(`Prazo atualizado, mas nenhum e-mail foi enviado: cota do Resend insuficiente (${usageSummary}). Avise pelo WhatsApp.`);
          emailTargets = [];
        } else if (allowed < targets.length) {
          emailTargets = targets.slice(0, allowed);
          warnings.push(`E-mails limitados a ${allowed} de ${targets.length} pela cota (${usageSummary}). Os demais só tiveram o prazo atualizado.`);
        }
      }

      const appUrl = getAppUrl(req.nextUrl.origin);
      const lots = await getLeadsLotLabels(emailTargets.map((lead) => lead.id)).catch(() => new Map());

      for (const lead of emailTargets) {
        const res = await sendQueueReleaseEmail({
          to: lead.email,
          name: lead.name,
          queuePosition: lead.queue_position,
          paymentUrl: `${appUrl}/checkout/${lead.id}`,
          lotName: (lots.get(lead.id) ?? DEFAULT_LOT).name,
          expirationHours: safeHours,
          leadId: lead.id,
        });
        if (res.success) emailedCount += 1;
        else {
          emailFailed += 1;
          if (res.quotaExceeded) {
            warnings.push('A cota do Resend esgotou durante o envio; os demais só tiveram o prazo atualizado.');
            break;
          }
        }
      }
    }

    await logNotification({
      level: emailFailed > 0 ? 'warn' : 'info',
      kind: 'batch',
      message: `Novo prazo de ${safeHours}h para ${targets.length} participante(s)` +
        (expiredIds.length ? `, ${expiredIds.length} reativado(s) de expirado` : '') +
        (sendEmail ? `; e-mails: ${emailedCount} enviado(s), ${emailFailed} falha(s)` : '; sem e-mail') +
        '.',
      meta: { ids: targetIds, hours: safeHours, deadline, sendEmail },
    });

    return NextResponse.json({
      success: true,
      updatedCount: targets.length,
      reactivatedCount: expiredIds.length,
      skippedPaid,
      deadline,
      emailedCount,
      emailFailed,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar prazo';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
