import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/payments';

export type LogLevel = 'info' | 'warn' | 'error';
export type NotificationKind =
  | 'confirmation'
  | 'release'
  | 'reminder'
  | 'ticket'
  | 'test'
  | 'batch'
  | 'usage';

export interface NotificationLogEntry {
  id: string;
  created_at: string;
  level: LogLevel;
  kind: NotificationKind | string;
  message: string;
  email: string | null;
  lead_id: string | null;
  error_code: string | null;
  meta: Record<string, unknown> | null;
}

export interface LogInput {
  level: LogLevel;
  kind: NotificationKind;
  message: string;
  email?: string | null;
  leadId?: string | null;
  errorCode?: string | null;
  meta?: Record<string, unknown> | null;
}

// Grava um registro na tabela notification_logs. Nunca lança erro:
// um log que falha não pode derrubar um envio de e-mail ou um webhook.
export async function logNotification(entry: LogInput): Promise<void> {
  const prefix = `[LOG:${entry.level.toUpperCase()}:${entry.kind}]`;
  if (entry.level === 'error') console.error(prefix, entry.message, entry.errorCode ?? '');
  else console.log(prefix, entry.message);

  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('notification_logs').insert({
      level: entry.level,
      kind: entry.kind,
      message: entry.message,
      email: entry.email ?? null,
      lead_id: entry.leadId ?? null,
      error_code: entry.errorCode ?? null,
      meta: entry.meta ?? null,
    });
    if (error) console.error('[LOG] Falha ao gravar notification_logs:', error.message);
  } catch (err) {
    console.error('[LOG] Exceção ao gravar notification_logs:', err);
  }
}

export async function listNotificationLogs(options: { level?: LogLevel | 'all'; limit?: number } = {}) {
  const supabase = createAdminClient();
  const limit = Math.max(1, Math.min(options.limit ?? 200, 500));

  let query = supabase
    .from('notification_logs')
    .select('id, created_at, level, kind, message, email, lead_id, error_code, meta')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.level && options.level !== 'all') {
    query = query.eq('level', options.level);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationLogEntry[];
}
