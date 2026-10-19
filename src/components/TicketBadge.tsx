'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PersonaMaskIcon } from './PersonaMaskIcon';
import { DEFAULT_LOT } from '@/lib/lots/labels';
import { CheckCircle2, Share2, Printer, AlertCircle } from 'lucide-react';

interface TicketBadgeProps {
  queuePosition: number;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  alreadyRegistered?: boolean;
  paid?: boolean;
  ticketCode?: string | null;
  lotName?: string;
  onReset?: () => void;
}

export function TicketBadge({
  queuePosition,
  name,
  phone,
  email,
  createdAt,
  alreadyRegistered,
  paid = false,
  ticketCode,
  lotName = DEFAULT_LOT.name,
  onReset,
}: TicketBadgeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const formattedPosition = String(queuePosition).padStart(4, '0');

  useEffect(() => {
    // Só ingresso pago recebe QR validável pela portaria. A inscrição na fila
    // permanece apenas como identificação de pré-venda.
    const payload = paid && ticketCode
      ? ticketCode
      : JSON.stringify({
          event: 'BAILE_DA_LAGOA_31.10',
          pos: queuePosition,
          phone,
          email,
          created: createdAt,
        });

    QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0B0B0D',
        light: '#E8E8EF',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [queuePosition, phone, email, createdAt, paid, ticketCode]);

  const handleShare = () => {
    const shareText = `Garanti meu lugar no Baile da Lagoa (31.10 · SJC)! Posição #${queuePosition}. Entre na lista:`;
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

    if (navigator.share) {
      navigator
        .share({
          title: 'Baile da Lagoa // 31.10 · SJC',
          text: shareText,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-stack-1">
      {/* Alerta de Confirmação (no-print) */}
      <div
        className={`no-print p-3 mb-3 border text-xs font-data flex items-center gap-2.5 ${
          alreadyRegistered
            ? 'bg-[#141418] border-[#8A3CFF] text-[#E8E8EF]'
            : 'bg-[#141418] border-[#FF2E3B] text-[#E8E8EF]'
        }`}
      >
        {paid ? (
          <CheckCircle2 className="w-4 h-4 text-[#8A3CFF] flex-shrink-0" />
        ) : alreadyRegistered ? (
          <AlertCircle className="w-4 h-4 text-[#8A3CFF] flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-[#FF2E3B] flex-shrink-0" />
        )}
        <span className="text-[11px] uppercase tracking-wider">
          {paid
            ? 'Ingresso pago. Seu lugar no baile está confirmado.'
            : alreadyRegistered
              ? 'Lugar já reservado. Sua prioridade no lote está ativa.'
              : `Lugar garantido na pré-venda do ${lotName}.`}
        </span>
      </div>

      {/* Cartão do Bilhete Baile da Lagoa */}
      <div className="print-only-ticket bg-[#141418] border border-[#1F1F24] text-[#E8E8EF] relative overflow-hidden shadow-2xl">
        {/* Header do Bilhete */}
        <div className="bg-[#8A3CFF] p-4 text-[#0B0B0D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PersonaMaskIcon className="w-6 h-4" fillColor="#0B0B0D" />
            <div>
              <span className="font-persona text-2xl tracking-tight block leading-none">
                BAILE DA LAGOA
              </span>
              <span className="font-data text-[9px] font-bold uppercase tracking-widest block mt-0.5">
                31.10 · SJC
              </span>
            </div>
          </div>
          <span className="font-data text-[10px] bg-[#0B0B0D] text-[#E8E8EF] px-2 py-0.5 uppercase font-bold">
            {paid ? 'PAGO' : lotName}
          </span>
        </div>

        {/* Posição Gigante */}
        <div className="p-6 text-center border-b border-[#1F1F24] bg-[#0B0B0D]/60">
          <span className="font-data text-[9px] uppercase tracking-widest text-[#5B5B66] block mb-1">
            SEU NÚMERO NA PRÉ-VENDA
          </span>
          <div className="font-persona text-7xl text-[#E8E8EF] leading-none">
            #{formattedPosition}
          </div>
          <span className="font-data text-[9px] uppercase tracking-widest text-[#8A3CFF] block mt-2">
            {paid ? 'INGRESSO CONFIRMADO' : 'PRIORIDADE GARANTIDA'}
          </span>
        </div>

        {/* Dados do Participante */}
        <div className="p-5 font-data text-xs space-y-2 border-b border-[#1F1F24]">
          <div className="flex justify-between items-center">
            <span className="text-[#5B5B66] text-[10px] uppercase">Nome:</span>
            <strong className="text-[#E8E8EF] uppercase">{name}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#5B5B66] text-[10px] uppercase">WhatsApp:</span>
            <span className="text-[#E8E8EF]">{phone}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#5B5B66] text-[10px] uppercase">E-mail:</span>
            <span className="text-[#E8E8EF] text-[11px] truncate max-w-[200px]">{email}</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-5 text-center bg-[#0B0B0D]">
          <div className="inline-block p-2 bg-[#E8E8EF] border border-[#1F1F24]">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={paid ? 'QR Code do ingresso' : 'QR Code da fila'} className="w-36 h-36 mx-auto" />
            ) : (
              <div className="w-36 h-36 bg-zinc-800 animate-pulse" />
            )}
          </div>
          <p className="font-data text-[9px] text-[#5B5B66] uppercase tracking-widest mt-2">
            {paid ? 'QR Code válido para entrada' : 'Código de identificação da pré-venda'}
          </p>
        </div>

        {/* Regra Curta */}
        <div className="p-4 bg-[#141418] border-t border-[#1F1F24] text-[11px] text-[#5B5B66] font-data text-center">
          {paid
            ? 'SEM MÁSCARA, SEM ENTRADA. INGRESSO OFICIAL ENVIADO PARA O SEU E-MAIL.'
            : 'SEM MÁSCARA, SEM ENTRADA. AVISO DE LIBERAÇÃO DIRETO NO SEU WHATSAPP.'}
        </div>

        {/* Ações (no-print) */}
        <div className="no-print p-4 bg-[#0B0B0D] border-t border-[#1F1F24] space-y-2 font-data">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="w-full bg-[#1F1F24] hover:bg-[#2b2b32] text-[#E8E8EF] py-2.5 px-3 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#8A3CFF]" />
              <span>Salvar Bilhete</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-bold py-2.5 px-3 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="w-full text-center text-[10px] text-[#5B5B66] hover:text-[#E8E8EF] py-1 transition-colors uppercase"
            >
              Consultar outro registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
