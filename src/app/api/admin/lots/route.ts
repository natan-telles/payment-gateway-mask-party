import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

interface LotInput {
  name?: unknown;
  sort_order?: unknown;
  price_cents?: unknown;
  capacity?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  is_active?: unknown;
}

// Valida e normaliza os campos enviados pelo painel (partial = edição)
function parseLotInput(body: LotInput, partial: boolean) {
  const updates: Record<string, string | number | boolean | null> = {};
  const errors: string[] = [];

  const has = (key: keyof LotInput) => body[key] !== undefined;
  const isInt = (value: unknown) => typeof value === 'number' && Number.isInteger(value);
  const isDateOrNull = (value: unknown) =>
    value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) errors.push('Nome é obrigatório.');
    else updates.name = body.name.trim();
  }
  if (!partial || has('sort_order')) {
    if (!isInt(body.sort_order)) errors.push('Ordem deve ser um número inteiro.');
    else updates.sort_order = body.sort_order as number;
  }
  if (!partial || has('price_cents')) {
    if (!isInt(body.price_cents) || (body.price_cents as number) <= 0) errors.push('Preço deve ser maior que zero.');
    else updates.price_cents = body.price_cents as number;
  }
  if (!partial || has('capacity')) {
    if (!isInt(body.capacity) || (body.capacity as number) < 0) errors.push('Quantidade deve ser zero ou mais.');
    else updates.capacity = body.capacity as number;
  }
  for (const key of ['starts_at', 'ends_at'] as const) {
    if (has(key)) {
      if (!isDateOrNull(body[key])) errors.push(`Data inválida em ${key === 'starts_at' ? 'início' : 'fim'}.`);
      else updates[key] = (body[key] as string | null) ?? null;
    }
  }
  if (has('is_active')) {
    if (typeof body.is_active !== 'boolean') errors.push('Status inválido.');
    else updates.is_active = body.is_active;
  }

  if (updates.starts_at && updates.ends_at && Date.parse(updates.ends_at as string) <= Date.parse(updates.starts_at as string)) {
    errors.push('O fim do lote precisa ser depois do início.');
  }

  return { updates, errors };
}

function dbErrorMessage(error: { code?: string; message: string }) {
  if (error.code === '23505') return 'Já existe um lote com essa ordem. Escolha outro número.';
  if (error.code === '23503') return 'Este lote já tem pedidos e não pode ser excluído. Desative-o.';
  return error.message;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado no servidor.' }, { status: 500 });
  }

  try {
    const supabase = createAdminClient();

    const [lotsRes, ordersRes, currentRes] = await Promise.all([
      supabase.from('ticket_lots').select('*').order('sort_order', { ascending: true }),
      supabase.from('payment_orders').select('lot_id, status, reserved_until').in('status', ['paid', 'reserved']),
      supabase.rpc('current_ticket_lot').maybeSingle(),
    ]);

    const error = lotsRes.error || ordersRes.error || currentRes.error;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Mesma regra de ocupação do banco: pagos + reservas ainda válidas
    const now = Date.now();
    const counts = new Map<string, { sold: number; reserved: number }>();
    for (const order of ordersRes.data ?? []) {
      const entry = counts.get(order.lot_id) ?? { sold: 0, reserved: 0 };
      if (order.status === 'paid') entry.sold += 1;
      else if (Date.parse(order.reserved_until) > now) entry.reserved += 1;
      counts.set(order.lot_id, entry);
    }

    const currentLotId = (currentRes.data as { id: string } | null)?.id ?? null;

    const lots = (lotsRes.data ?? []).map((lot) => {
      const { sold, reserved } = counts.get(lot.id) ?? { sold: 0, reserved: 0 };
      return {
        ...lot,
        sold,
        reserved,
        available: Math.max(0, lot.capacity - sold - reserved),
        is_current: lot.id === currentLotId,
      };
    });

    return NextResponse.json({ success: true, data: lots });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro ao carregar lotes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { updates, errors } = parseLotInput(await req.json(), false);
    if (errors.length) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from('ticket_lots').insert(updates).select().single();

    if (error) {
      return NextResponse.json({ success: false, error: dbErrorMessage(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro ao criar lote' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const { updates, errors } = parseLotInput(body, true);
    if (errors.length) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Não deixa reduzir a quantidade abaixo do que já foi vendido
    if (typeof updates.capacity === 'number') {
      const { count } = await supabase
        .from('payment_orders')
        .select('id', { count: 'exact', head: true })
        .eq('lot_id', body.id)
        .eq('status', 'paid');

      if ((count ?? 0) > updates.capacity) {
        return NextResponse.json(
          { success: false, error: `Este lote já vendeu ${count} ingressos. A quantidade não pode ser menor que isso.` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase.from('ticket_lots').update(updates).eq('id', body.id).select().single();

    if (error) {
      return NextResponse.json({ success: false, error: dbErrorMessage(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar lote' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('ticket_lots').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: dbErrorMessage(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Lote removido com sucesso' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro ao remover lote' }, { status: 500 });
  }
}
