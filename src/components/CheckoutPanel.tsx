'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '@/lib/payments/format';

type CheckoutStatus = 'available' | 'paid' | 'not_released' | 'deadline_passed' | 'sold_out';

interface CheckoutSummary {
  name: string;
  queuePosition: number;
  paymentDeadline: string | null;
  status: CheckoutStatus;
  ticketCode?: string | null;
  lot?: { name: string; priceCents: number };
  reservedUntil?: string;
}

const BLOCKED_MESSAGES: Record<Exclude<CheckoutStatus, 'available' | 'paid'>, string> = {
  not_released: 'Seu lugar na fila ainda não foi liberado para compra. Aguarde o e-mail de liberação.',
  deadline_passed: 'O prazo para pagamento do seu lugar expirou.',
  sold_out: 'Ingressos esgotados no momento. Fique de olho: vagas não pagas voltam em até 30 minutos.',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function CheckoutPanel({ leadId }: { leadId: string }) {
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/checkout?lead=${encodeURIComponent(leadId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao carregar o checkout.');
        setSummary(json.data);
      })
      .catch((err) => setError(err.message));
  }, [leadId]);

  const handlePay = async () => {
    setPaying(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Não foi possível gerar o pagamento.');
      }

      window.location.href = json.data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o pagamento.');
      setPaying(false);
    }
  };

  if (!summary && !error) {
    return <Loader2 className="w-6 h-6 animate-spin text-[#8A3CFF]" />;
  }

  return (
    <div className="bg-[#141418] text-[#E8E8EF] border border-[#1F1F24] w-full max-w-sm p-6 shadow-2xl">
      <span className="font-data text-[9px] uppercase text-[#8A3CFF] tracking-widest block mb-1">
        {'// CHECKOUT BAILE DA LAGOA'}
      </span>
      <h1 className="font-persona text-2xl uppercase tracking-tight mb-4">
        {summary ? `OLÁ, ${summary.name.split(' ')[0]}` : 'CHECKOUT'}
      </h1>

      {error && (
        <div className="mb-4 p-2.5 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs font-data flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {summary?.status === 'paid' && (
        <div className="p-4 bg-[#0B0B0D] border border-[#1F1F24] text-center">
          <CheckCircle2 className="w-6 h-6 text-[#8A3CFF] mx-auto mb-2" />
          <p className="font-data text-[10px] uppercase text-[#5B5B66] mb-1">Ingresso confirmado</p>
          <p className="font-persona text-3xl text-[#8A3CFF]">{summary.ticketCode}</p>
        </div>
      )}

      {summary && summary.status !== 'available' && summary.status !== 'paid' && (
        <p className="font-data text-xs text-[#5B5B66] leading-relaxed">{BLOCKED_MESSAGES[summary.status]}</p>
      )}

      {summary?.status === 'available' && summary.lot && (
        <>
          <div className="p-4 bg-[#0B0B0D] border border-[#1F1F24] mb-4 font-data text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#5B5B66] uppercase">Lote</span>
              <span>{summary.lot.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5B5B66] uppercase">Posição</span>
              <span>#{String(summary.queuePosition).padStart(4, '0')}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-[#5B5B66] uppercase text-xs self-center">Total</span>
              <span className="font-persona text-[#8A3CFF]">{formatPrice(summary.lot.priceCents)}</span>
            </div>
          </div>

          <p className="font-data text-[10px] text-[#5B5B66] uppercase leading-relaxed mb-4">
            {summary.reservedUntil
              ? `Vaga reservada até ${formatDateTime(summary.reservedUntil)}.`
              : 'Ao continuar, sua vaga fica reservada por 30 minutos.'}
            {summary.paymentDeadline && ` Prazo final: ${formatDateTime(summary.paymentDeadline)}.`}
          </p>

          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full bg-[#FF2E3B] hover:bg-[#ff4b56] text-white font-persona text-lg py-3 px-4 uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {paying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>GERANDO PAGAMENTO...</span>
              </>
            ) : (
              <>
                <span>PAGAR VIA PIX</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </>
      )}

      <Link href="/" className="block text-center font-data text-[10px] uppercase text-[#5B5B66] hover:text-[#E8E8EF] mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
