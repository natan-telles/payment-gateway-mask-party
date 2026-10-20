import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/payments';
import { listNotificationLogs, LogLevel } from '@/lib/notifications/log';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

// Lista os registros de notification_logs (mais recentes primeiro)
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const levelParam = searchParams.get('level') ?? 'all';
  const level: LogLevel | 'all' = ['info', 'warn', 'error'].includes(levelParam) ? (levelParam as LogLevel) : 'all';
  const limit = Number(searchParams.get('limit') ?? 200);

  try {
    const logs = await listNotificationLogs({ level, limit });
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar logs';
    // Tabela ainda não criada é o caso mais comum no primeiro acesso
    const hint = /notification_logs/.test(message)
      ? ' Rode a seção 6 do supabase/schema.sql no SQL Editor do Supabase.'
      : '';
    return NextResponse.json({ success: false, error: message + hint }, { status: 500 });
  }
}
