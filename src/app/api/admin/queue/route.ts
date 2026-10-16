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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const notificationStatus = searchParams.get('notification_status');
    const paymentStatus = searchParams.get('payment_status');
    const source = searchParams.get('source');

    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref');

    if (!hasSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Supabase não está configurado no servidor.',
      }, { status: 500 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('waiting_queue')
      .select('*')
      .order('queue_position', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (notificationStatus && notificationStatus !== 'all') {
      query = query.eq('notification_status', notificationStatus);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    const { data: leads, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Calcula métricas resumidas
    const total = leads?.length || 0;
    const notifiedCount = leads?.filter((l) => l.notification_status === 'sent').length || 0;
    const paidCount = leads?.filter((l) => l.payment_status === 'approved').length || 0;
    const pendingPaymentCount = leads?.filter((l) => l.payment_status === 'pending').length || 0;

    return NextResponse.json({
      success: true,
      data: leads || [],
      metrics: {
        total,
        notifiedCount,
        paidCount,
        pendingPaymentCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao carregar dados' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, notification_status, payment_status, ticket_status, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updates: Record<string, any> = {};
    if (notification_status !== undefined) {
      updates.notification_status = notification_status;
      if (notification_status === 'sent') {
        updates.notification_date = new Date().toISOString();
      }
    }
    if (payment_status !== undefined) {
      updates.payment_status = payment_status;
      if (payment_status === 'approved') {
        updates.payment_date = new Date().toISOString();
        // Se aprovado e sem ticket_code, gera um ticket code único
        updates.ticket_status = 'issued';
        updates.ticket_code = `MASK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
    }
    if (ticket_status !== undefined) updates.ticket_status = ticket_status;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('waiting_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao atualizar registro' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('waiting_queue').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Registro removido com sucesso' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao deletar registro' },
      { status: 500 }
    );
  }
}
