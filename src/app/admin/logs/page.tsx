'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CircleAlert, Info, Mail, RefreshCw, ScrollText } from 'lucide-react';
import { AdminNavTabs } from '@/components/AdminNavTabs';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';

const ADMIN_PW_KEY = 'mask_party_admin_pw';
const subscribeToNothing = () => () => {};

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  id: string;
  created_at: string;
  level: LogLevel;
  kind: string;
  message: string;
  email: string | null;
  lead_id: string | null;
  error_code: string | null;
  meta: Record<string, unknown> | null;
}

interface UsageWindow {
  used: number;
  limit: number | null;
  remaining: number | null;
  resetsAt: string | null;
}

type Usage =
  | { available: true; daily: UsageWindow; monthly: UsageWindow; checkedAt: string }
  | { available: false; reason: string; checkedAt: string };

const KIND_LABELS: Record<string, string> = {
  confirmation: 'Confirmação de fila',
  release: 'Liberação',
  reminder: 'Lembrete',
  ticket: 'Ingresso',
  test: 'Teste',
  batch: 'Disparo em lote',
  usage: 'Cota',
};

const LEVEL_STYLES: Record<LogLevel, { border: string; badge: string; label: string; Icon: typeof Info }> = {
  error: { border: 'border-l-red-500', badge: 'bg-red-950/60 text-red-300 border-red-500/50', label: 'ERRO', Icon: CircleAlert },
  warn: { border: 'border-l-amber-400', badge: 'bg-amber-950/60 text-amber-300 border-amber-400/50', label: 'AVISO', Icon: AlertTriangle },
  info: { border: 'border-l-[#8A3CFF]', badge: 'bg-[#8A3CFF]/10 text-[#B48CFF] border-[#8A3CFF]/50', label: 'INFO', Icon: Info },
};

function useAdminPassword() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => sessionStorage.getItem(ADMIN_PW_KEY) ?? '',
    () => null
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function UsageBar({ title, window: w }: { title: string; window: UsageWindow }) {
  const pct = w.limit ? Math.min(100, Math.round((w.used / w.limit) * 100)) : 0;
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-[#8A3CFF]';
  return (
    <div className="bg-[#0B0B0D] border border-[#1F1F24] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-[#5B5B66]">{title}</span>
        <span className="font-persona text-2xl">
          {w.used}
          <span className="text-[#5B5B66] text-base"> / {w.limit ?? '∞'}</span>
        </span>
      </div>
      <div className="h-1.5 bg-[#1F1F24] overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-[#5B5B66]">
        <span>Restam: <strong className="text-[#E8E8EF]">{w.remaining ?? '∞'}</strong></span>
        <span>Zera às {formatTime(w.resetsAt)}</span>
      </div>
    </div>
  );
}

async function fetchLogsAndUsage(password: string, level: LogLevel | 'all') {
  const headers = { 'x-admin-password': password };
  try {
    const [logsRes, usageRes] = await Promise.all([
      fetch(`/api/admin/logs?level=${level}&limit=300`, { headers }),
      fetch('/api/admin/notifications/usage', { headers }),
    ]);
    const logsJson = await logsRes.json();
    const usageJson = await usageRes.json();
    return {
      error: logsJson.success ? null : (logsJson.error as string) || 'Falha ao carregar logs.',
      logs: logsJson.success ? (logsJson.logs as LogEntry[]) : null,
      usage: usageJson.success ? (usageJson.usage as Usage) : null,
    };
  } catch {
    return { error: 'Não foi possível comunicar com o servidor.', logs: null, usage: null };
  }
}

export default function LogsPage() {
  const password = useAdminPassword();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedAt, setLoadedAt] = useState(0);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const changeFilter = (lvl: LogLevel | 'all') => {
    setLoading(true);
    setLevelFilter(lvl);
  };

  useEffect(() => {
    if (!password) return;
    let cancelled = false;

    fetchLogsAndUsage(password, levelFilter).then((result) => {
      if (cancelled) return;
      setError(result.error);
      if (result.logs) setLogs(result.logs);
      if (result.usage) setUsage(result.usage);
      setLoadedAt(Date.now());
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [password, levelFilter, refreshKey]);

  if (password === null) return <div className="min-h-screen bg-[#0B0B0D]" />;

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex items-center justify-center p-4">
        <div className="bg-[#141418] border border-[#1F1F24] p-8 max-w-sm w-full text-center shadow-2xl">
          <span className="font-data text-[10px] uppercase text-[#8A3CFF] tracking-widest block mb-2">{'// AUTENTICAÇÃO NECESSÁRIA'}</span>
          <h1 className="font-persona text-3xl uppercase mb-4">ACESSO RESTRITO</h1>
          <p className="text-xs text-[#5B5B66] font-data mb-6">Faça login primeiro no painel principal.</p>
          <Link href="/admin" className="block bg-[#8A3CFF] text-[#0B0B0D] font-persona text-lg py-3 uppercase">Ir para o Login Admin →</Link>
        </div>
      </div>
    );
  }

  const since24h = loadedAt - 24 * 60 * 60 * 1000;
  const errors24h = logs.filter((l) => l.level === 'error' && new Date(l.created_at).getTime() >= since24h).length;
  const warns24h = logs.filter((l) => l.level === 'warn' && new Date(l.created_at).getTime() >= since24h).length;
  const ticketFailures = logs.filter((l) => l.level === 'error' && l.kind === 'ticket').length;

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] p-4 pb-28 md:p-8 font-data">
      <header className="max-w-6xl mx-auto border-b border-[#1F1F24] pb-6 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-1.5 bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF] text-[#5B5B66] hover:text-[#E8E8EF]" title="Voltar"><ArrowLeft className="w-4 h-4" /></Link>
          <PersonaMaskIcon className="w-5 h-3.5" fillColor="#8A3CFF" />
          <div>
            <h1 className="font-persona text-3xl uppercase tracking-tight">BAILE DA LAGOA <span className="text-[#8A3CFF]">{'// LOGS'}</span></h1>
            <p className="text-[10px] text-[#5B5B66] uppercase tracking-widest mt-0.5">E-MAILS, ERROS E COTA DO RESEND</p>
          </div>
        </div>
        <AdminNavTabs activeTab="logs" />
      </header>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* COTA DO RESEND */}
        <section className="bg-[#141418] border border-[#1F1F24] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8A3CFF]" />
              <h2 className="font-persona text-xl uppercase">Cota do Resend</h2>
            </div>
            <button onClick={refresh} disabled={loading} className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#5B5B66] hover:text-[#E8E8EF] disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>

          {usage === null ? (
            <p className="text-xs text-[#5B5B66]">Consultando...</p>
          ) : usage.available ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <UsageBar title="Hoje (dia UTC)" window={usage.daily} />
              <UsageBar title="Este mês" window={usage.monthly} />
            </div>
          ) : (
            <div className="border border-amber-400/40 bg-amber-950/20 p-3 text-xs text-amber-200 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{usage.reason}</span>
            </div>
          )}
          <p className="text-[10px] text-[#5B5B66] mt-3">
            Cada pessoa consome até 3 e-mails: confirmação de fila, liberação e ingresso. A trava de liberação guarda metade da cota restante para os ingressos.
          </p>
        </section>

        {/* RESUMO */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[9px] uppercase tracking-widest text-[#5B5B66] block">Erros · 24h</span>
            <span className={`font-persona text-4xl ${errors24h > 0 ? 'text-red-400' : 'text-[#E8E8EF]'}`}>{errors24h}</span>
          </div>
          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[9px] uppercase tracking-widest text-[#5B5B66] block">Avisos · 24h</span>
            <span className={`font-persona text-4xl ${warns24h > 0 ? 'text-amber-300' : 'text-[#E8E8EF]'}`}>{warns24h}</span>
          </div>
          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[9px] uppercase tracking-widest text-[#5B5B66] block">Ingressos não entregues</span>
            <span className={`font-persona text-4xl ${ticketFailures > 0 ? 'text-red-400' : 'text-[#E8E8EF]'}`}>{ticketFailures}</span>
          </div>
        </section>

        {/* LISTA */}
        <section className="bg-[#141418] border border-[#1F1F24] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#8A3CFF]" />
              <h2 className="font-persona text-xl uppercase">Registros</h2>
              <span className="text-[10px] text-[#5B5B66]">({logs.length})</span>
            </div>
            <div className="flex gap-1">
              {(['all', 'error', 'warn', 'info'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => changeFilter(lvl)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-colors ${
                    levelFilter === lvl ? 'bg-[#8A3CFF] text-[#0B0B0D] border-[#8A3CFF] font-bold' : 'bg-[#0B0B0D] text-[#5B5B66] border-[#1F1F24] hover:text-[#E8E8EF]'
                  }`}
                >
                  {lvl === 'all' ? 'Todos' : lvl === 'error' ? 'Erros' : lvl === 'warn' ? 'Avisos' : 'Info'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-200 mb-4">{error}</div>
          )}

          {!error && logs.length === 0 && !loading && (
            <p className="text-xs text-[#5B5B66] py-8 text-center">Nenhum registro ainda. Erros de envio e resumos de disparo aparecem aqui.</p>
          )}

          <ul className="space-y-2">
            {logs.map((log) => {
              const style = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info;
              const isOpen = expanded === log.id;
              return (
                <li key={log.id} className={`bg-[#0B0B0D] border border-[#1F1F24] border-l-4 ${style.border}`}>
                  <button onClick={() => setExpanded(isOpen ? null : log.id)} className="w-full text-left p-3 flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                    <div className="flex items-center gap-2 shrink-0 md:w-56">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase tracking-wider border ${style.badge}`}>
                        <style.Icon className="w-3 h-3" /> {style.label}
                      </span>
                      <span className="text-[10px] text-[#5B5B66]">{formatDate(log.created_at)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase tracking-widest text-[#8A3CFF] block mb-0.5">
                        {KIND_LABELS[log.kind] ?? log.kind}
                        {log.error_code ? <span className="text-[#5B5B66]"> · {log.error_code}</span> : null}
                      </span>
                      <p className="text-xs text-[#E8E8EF] break-words">{log.message}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 text-[10px] text-[#8C8C9A] space-y-1 border-t border-[#1F1F24] pt-2">
                      {log.email && <p>E-mail: <span className="text-[#E8E8EF]">{log.email}</span></p>}
                      {log.lead_id && <p>Lead: <span className="text-[#E8E8EF]">{log.lead_id}</span></p>}
                      {log.meta && (
                        <pre className="bg-[#141418] border border-[#1F1F24] p-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.meta, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
