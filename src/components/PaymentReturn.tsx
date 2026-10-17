'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type ConfirmStatus = 'confirmed' | 'already_confirmed' | 'duplicate' | 'not_paid' | 'amount_mismatch' | 'not_found';

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 12;

export function PaymentReturn() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  const [status, setStatus] = useState<ConfirmStatus | 'checking' | 'error'>('checking');
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      attempts += 1;
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.success) {
          setStatus('error');
          return;
        }

        // Pix pode levar alguns segundos para compensar: tenta novamente
        if (json.data.status === 'not_paid' && attempts < MAX_ATTEMPTS) {
          timer = setTimeout(check, POLL_INTERVAL_MS);
          return;
        }

        setStatus(json.data.status);
        setTicketCode(json.data.ticketCode);
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!ticketCode) return;
    QRCode.toDataURL(ticketCode, { width: 200, margin: 1, color: { dark: '#0B0B0D', light: '#E8E8EF' } })
      .then(setQrDataUrl)
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [ticketCode]);

  const isPaid = status === 'confirmed' || status === 'already_confirmed' || status === 'duplicate';

  return (
    <div className="bg-[#141418] text-[#E8E8EF] border border-[#1F1F24] w-full max-w-sm p-6 shadow-2xl text-center">
      <span className="font-data text-[9px] uppercase text-[#8A3CFF] tracking-widest block mb-4">
        {'// PAGAMENTO BAILE DA LAGOA'}
      </span>

      {status === 'checking' && (
        <>
          <Loader2 className="w-8 h-8 animate-spin text-[#8A3CFF] mx-auto mb-4" />
          <h1 className="font-persona text-2xl uppercase mb-2">CONFIRMANDO PAGAMENTO</h1>
          <p className="font-data text-xs text-[#5B5B66]">Isso pode levar alguns segundos. Não feche esta página.</p>
        </>
      )}

      {isPaid && ticketCode && (
        <>
          <CheckCircle2 className="w-8 h-8 text-[#8A3CFF] mx-auto mb-3" />
          <h1 className="font-persona text-2xl uppercase mb-4">INGRESSO CONFIRMADO</h1>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada localmente */}
          {qrDataUrl && <img src={qrDataUrl} alt="QR Code do ingresso" className="mx-auto mb-3 w-40 h-40" />}
          <p className="font-persona text-3xl text-[#8A3CFF] mb-2">{ticketCode}</p>
          <p className="font-data text-xs text-[#5B5B66]">
            Enviamos o ingresso para o seu e-mail. Apresente este código na entrada.
          </p>
        </>
      )}

      {(status === 'not_paid' || status === 'error' || status === 'not_found' || status === 'amount_mismatch') && (
        <>
          <AlertCircle className="w-8 h-8 text-[#FF2E3B] mx-auto mb-3" />
          <h1 className="font-persona text-2xl uppercase mb-2">
            {status === 'not_paid' ? 'AGUARDANDO PAGAMENTO' : 'NÃO FOI POSSÍVEL CONFIRMAR'}
          </h1>
          <p className="font-data text-xs text-[#5B5B66] leading-relaxed">
            {status === 'not_paid'
              ? 'Ainda não recebemos a confirmação do Pix. Assim que ela chegar, você recebe o ingresso por e-mail.'
              : 'Se você já pagou, consulte seu status na página inicial ou fale com a organização.'}
          </p>
        </>
      )}

      <Link href="/" className="block font-data text-[10px] uppercase text-[#5B5B66] hover:text-[#E8E8EF] mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
