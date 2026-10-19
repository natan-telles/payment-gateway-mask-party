import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const { ticketCode } = await req.json();
    if (typeof ticketCode !== 'string' || !ticketCode.trim()) {
      return NextResponse.json({ success: false, error: 'Informe o código do ingresso.' }, { status: 400 });
    }

    const { data, error } = await createAdminClient().rpc('check_in_ticket', {
      p_ticket_code: ticketCode,
    });

    if (error) {
      console.error('[CHECK-IN] Falha ao validar ingresso:', error.message);
      return NextResponse.json({ success: false, error: 'Não foi possível validar o ingresso.' }, { status: 500 });
    }

    const result = data as { success: boolean; status: string; error?: string; name?: string; ticket_code?: string; checkin_at?: string };
    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) {
    console.error('[CHECK-IN] Erro inesperado:', error);
    return NextResponse.json({ success: false, error: 'Dados de check-in inválidos.' }, { status: 400 });
  }
}
