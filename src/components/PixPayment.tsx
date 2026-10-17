'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { Loader2, Copy, Check } from 'lucide-react';

export interface PixData {
  orderId: string;
  code: string;
  paymentId: string | null;
  expiresAt: string;
}

const POLL_INTERVAL_MS = 5_000;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Pix exibido no próprio site: QR + copia-e-cola, com acompanhamento automático do pagamento
export function PixPayment({ pix, onExpired }: { pix: PixData; onExpired: () => void }) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [remainingMs, setRemainingMs] = useState(() => new Date(pix.expiresAt).getTime() - Date.now());

  const returnQuery = new URLSearchParams({ order_nsu: pix.orderId, payment_id: pix.paymentId ?? '' }).toString();
  const expired = remainingMs <= 0;

  useEffect(() => {
    QRCode.toDataURL(pix.code, { width: 240, margin: 1, color: { dark: '#0B0B0D', light: '#E8E8EF' } })
      .then(setQrDataUrl)
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [pix.code]);

  useEffect(() => {
    const timer = setInterval(() => setRemainingMs(new Date(pix.expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pix.expiresAt]);

  // Consulta o pagamento até confirmar; o webhook cobre quem fechar a página
  useEffect(() => {
    if (expired || !pix.paymentId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: returnQuery }),
        });
        const json = await res.json();
        const status = json?.data?.status;

        if (!cancelled && ['confirmed', 'already_confirmed', 'duplicate'].includes(status)) {
          router.push(`/pagamento/retorno?${returnQuery}`);
          return;
        }
      } catch {
        // Falha de rede pontual: tenta de novo no próximo ciclo
      }
      if (!cancelled) timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    timer = setTimeout(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expired, pix.paymentId, returnQuery, router]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pix.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Navegadores sem permissão de clipboard: o código continua visível para copiar manualmente
    }
  };

  if (expired) {
    return (
      <div className="text-center font-data text-xs space-y-4">
        <p className="text-[#5B5B66] leading-relaxed">
          Este Pix expirou e a reserva da sua vaga foi liberada. Se ainda estiver no prazo, gere um novo Pix.
        </p>
        <button
          onClick={onExpired}
          className="w-full bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-persona text-lg py-3 px-4 uppercase transition-colors"
        >
          GERAR NOVO PIX
        </button>
      </div>
    );
  }

  return (
    <div className="text-center font-data text-xs">
      <p className="text-[#5B5B66] uppercase mb-3">Escaneie o QR Code no app do seu banco</p>

      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL gerada localmente
        <img src={qrDataUrl} alt="QR Code Pix" className="mx-auto mb-4 w-52 h-52" />
      ) : (
        <Loader2 className="w-6 h-6 animate-spin text-[#8A3CFF] mx-auto mb-4" />
      )}

      <p className="text-[#5B5B66] uppercase mb-2">Ou use o Pix copia e cola</p>
      <div className="p-2.5 bg-[#0B0B0D] border border-[#1F1F24] text-[10px] break-all text-left mb-2 max-h-20 overflow-y-auto select-all">
        {pix.code}
      </div>
      <button
        onClick={handleCopy}
        className="w-full border border-[#1F1F24] hover:border-[#8A3CFF] font-persona text-base py-2.5 px-4 uppercase flex items-center justify-center gap-2 transition-colors mb-4"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'CÓDIGO COPIADO' : 'COPIAR CÓDIGO PIX'}
      </button>

      <div className="flex items-center justify-center gap-2 text-[#5B5B66] uppercase">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A3CFF]" />
        <span>Aguardando pagamento · expira em {formatRemaining(remainingMs)}</span>
      </div>
    </div>
  );
}
