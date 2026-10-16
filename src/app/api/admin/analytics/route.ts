import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
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

    const { data: leads, error } = await supabase
      .from('waiting_queue')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const allLeads = leads || [];
    const totalLeads = allLeads.length;

    // 1. REGISTRATIONS BY DAY (Inscrições por Dia)
    const dayMap = new Map<string, number>();
    allLeads.forEach((l) => {
      const dateKey = new Date(l.created_at).toISOString().slice(0, 10);
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1);
    });

    let cumulative = 0;
    const byDay = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => {
        cumulative += count;
        const [year, month, day] = date.split('-');
        return {
          date,
          displayDate: `${day}/${month}`,
          count,
          cumulative,
        };
      });

    // 2. REGISTRATIONS BY NEIGHBORHOOD (Inscrições por Bairro)
    const neighborhoodMap = new Map<string, number>();
    let undeclaredNeighborhood = 0;

    allLeads.forEach((l) => {
      const raw = l.neighborhood?.trim();
      if (!raw) {
        undeclaredNeighborhood += 1;
        return;
      }
      // Normaliza para Primeira Letra Maiúscula
      const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      neighborhoodMap.set(normalized, (neighborhoodMap.get(normalized) || 0) + 1);
    });

    const byNeighborhood = Array.from(neighborhoodMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([neighborhood, count]) => ({
        neighborhood,
        count,
        percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
      }));

    if (undeclaredNeighborhood > 0) {
      byNeighborhood.push({
        neighborhood: 'Não informado',
        count: undeclaredNeighborhood,
        percentage: totalLeads > 0 ? Number(((undeclaredNeighborhood / totalLeads) * 100).toFixed(1)) : 0,
      });
    }

    // 3. AGE DISTRIBUTION (Distribuição por Faixa Etária)
    const ageRanges = {
      '18-21': 0,
      '22-25': 0,
      '26-30': 0,
      '31-35': 0,
      '36+': 0,
      'Não informada': 0,
    };

    let totalAgeSum = 0;
    let declaredAgeCount = 0;

    allLeads.forEach((l) => {
      const age = l.age;
      if (typeof age === 'number' && age > 0) {
        totalAgeSum += age;
        declaredAgeCount += 1;
        if (age <= 21) ageRanges['18-21'] += 1;
        else if (age <= 25) ageRanges['22-25'] += 1;
        else if (age <= 30) ageRanges['26-30'] += 1;
        else if (age <= 35) ageRanges['31-35'] += 1;
        else ageRanges['36+'] += 1;
      } else {
        ageRanges['Não informada'] += 1;
      }
    });

    const ageDistribution = Object.entries(ageRanges).map(([range, count]) => ({
      range,
      count,
      percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
    }));

    const averageAge = declaredAgeCount > 0 ? Math.round(totalAgeSum / declaredAgeCount) : 0;

    // 4. CONVERSION FUNNEL (Funil de Conversão)
    const notifiedCount = allLeads.filter((l) => l.notification_status === 'sent').length;
    const pendingPaymentCount = allLeads.filter((l) => l.payment_status === 'pending').length;
    const paidCount = allLeads.filter((l) => l.payment_status === 'approved').length;
    const checkinCount = allLeads.filter((l) => l.checkin_status === true).length;

    const funnel = {
      stages: [
        {
          name: '1. Inscritos na Fila',
          count: totalLeads,
          percentage: 100,
          description: 'Total de leads registrados na landing page',
        },
        {
          name: '2. Notificados / Convocados',
          count: notifiedCount,
          percentage: totalLeads > 0 ? Number(((notifiedCount / totalLeads) * 100).toFixed(1)) : 0,
          description: 'Participantes que receberam e-mail com link PIX',
        },
        {
          name: '3. Pagamento Pendente',
          count: pendingPaymentCount,
          percentage: totalLeads > 0 ? Number(((pendingPaymentCount / totalLeads) * 100).toFixed(1)) : 0,
          description: 'Aguardando compensação do pagamento',
        },
        {
          name: '4. Pagamento Aprovado / Ingressos',
          count: paidCount,
          percentage: totalLeads > 0 ? Number(((paidCount / totalLeads) * 100).toFixed(1)) : 0,
          conversionFromNotified: notifiedCount > 0 ? Number(((paidCount / notifiedCount) * 100).toFixed(1)) : 0,
          description: 'Ingressos confirmados com QR Code emitido',
        },
        {
          name: '5. Check-in na Entrada',
          count: checkinCount,
          percentage: paidCount > 0 ? Number(((checkinCount / paidCount) * 100).toFixed(1)) : 0,
          description: 'Participantes validados na portaria do evento',
        },
      ],
      overallConversionRate: totalLeads > 0 ? Number(((paidCount / totalLeads) * 100).toFixed(1)) : 0,
      notifiedConversionRate: notifiedCount > 0 ? Number(((paidCount / notifiedCount) * 100).toFixed(1)) : 0,
    };

    // 5. CAMPAIGN ATTRIBUTION (Atribuição de Campanhas / Fontes)
    const sourceMap = new Map<string, { count: number; paid: number }>();

    allLeads.forEach((l) => {
      const src = (l.source || 'direct').toLowerCase();
      const current = sourceMap.get(src) || { count: 0, paid: 0 };
      current.count += 1;
      if (l.payment_status === 'approved') {
        current.paid += 1;
      }
      sourceMap.set(src, current);
    });

    const campaignAttribution = Array.from(sourceMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([source, stats]) => ({
        source: source.toUpperCase(),
        count: stats.count,
        percentage: totalLeads > 0 ? Number(((stats.count / totalLeads) * 100).toFixed(1)) : 0,
        paidCount: stats.paid,
        conversionRate: stats.count > 0 ? Number(((stats.paid / stats.count) * 100).toFixed(1)) : 0,
      }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalLeads,
          notifiedCount,
          paidCount,
          averageAge,
        },
        byDay,
        byNeighborhood,
        ageDistribution,
        funnel,
        campaignAttribution,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao calcular analytics' },
      { status: 500 }
    );
  }
}
