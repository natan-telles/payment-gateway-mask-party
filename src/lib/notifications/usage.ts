// Consulta a cota de e-mails do Resend (GET https://api.resend.com/usage).
// A chave precisa ter permissão "full access"; uma chave "sending access" recebe 401/403.

export interface UsageWindow {
  used: number;
  /** null = sem limite no plano */
  limit: number | null;
  remaining: number | null;
  sent: number;
  resetsAt: string | null;
}

export type ResendUsage =
  | {
      available: true;
      daily: UsageWindow;
      monthly: UsageWindow;
      checkedAt: string;
    }
  | {
      available: false;
      reason: string;
      checkedAt: string;
    };

interface RawWindow {
  used?: number;
  limit?: number | null;
  sent?: number;
  received?: number;
  resets_at?: string | null;
}

function toWindow(raw: RawWindow | undefined): UsageWindow {
  const used = Number(raw?.used ?? 0);
  const limit = raw?.limit === null || raw?.limit === undefined ? null : Number(raw.limit);
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    sent: Number(raw?.sent ?? 0),
    resetsAt: raw?.resets_at ?? null,
  };
}

export async function getResendUsage(): Promise<ResendUsage> {
  const checkedAt = new Date().toISOString();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { available: false, reason: 'RESEND_API_KEY não configurada (modo simulação).', checkedAt };
  }

  try {
    const res = await fetch('https://api.resend.com/usage', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) {
      return {
        available: false,
        reason: 'A chave do Resend não tem permissão "full access" para consultar o uso. Gere uma chave full access no painel do Resend.',
        checkedAt,
      };
    }

    if (!res.ok) {
      return { available: false, reason: `Resend respondeu ${res.status} ao consultar o uso.`, checkedAt };
    }

    const json = (await res.json()) as { emails?: { daily?: RawWindow; monthly?: RawWindow } };

    return {
      available: true,
      daily: toWindow(json.emails?.daily),
      monthly: toWindow(json.emails?.monthly),
      checkedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    return { available: false, reason: `Falha ao consultar o uso do Resend: ${message}`, checkedAt };
  }
}

/**
 * Quantos e-mails ainda podem sair hoje E neste mês (o menor dos dois).
 * null = sem limite conhecido (plano sem cap ou consulta indisponível).
 */
export function emailsRemaining(usage: ResendUsage): number | null {
  if (!usage.available) return null;
  const values = [usage.daily.remaining, usage.monthly.remaining].filter(
    (v): v is number => typeof v === 'number'
  );
  if (values.length === 0) return null;
  return Math.min(...values);
}

/** Texto curto para feedback no painel, ex.: "37/100 hoje · zera às 21:00". */
export function describeUsage(usage: ResendUsage): string {
  if (!usage.available) return usage.reason;
  const { daily, monthly } = usage;
  const dailyText = daily.limit === null ? `${daily.used} hoje (sem limite)` : `${daily.used}/${daily.limit} hoje`;
  const monthText = monthly.limit === null ? '' : ` · ${monthly.used}/${monthly.limit} no mês`;
  const resetText = daily.resetsAt
    ? ` · zera às ${new Date(daily.resetsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`
    : '';
  return `${dailyText}${monthText}${resetText}`;
}
