'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Share2, Printer, ArrowRight, ShieldCheck, AlertCircle, Clock, Calendar, Check } from 'lucide-react';

interface TicketBadgeProps {
  queuePosition: number;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  alreadyRegistered?: boolean;
  onReset?: () => void;
}

export function TicketBadge({
  queuePosition,
  name,
  phone,
  email,
  createdAt,
  alreadyRegistered,
  onReset,
}: TicketBadgeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Formata o número da posição com zeros à esquerda
  const formattedPosition = String(queuePosition).padStart(4, '0');

  useEffect(() => {
    const payload = JSON.stringify({
      event: 'MASK_PARTY_2026',
      pos: queuePosition,
      phone,
      email,
      created: createdAt,
    });

    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [queuePosition, phone, email, createdAt]);

  const handleShare = () => {
    const shareText = `Garanti meu lugar na fila oficial da Mask Party! Posição #${queuePosition}. Entre na fila você também:`;
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

    if (navigator.share) {
      navigator
        .share({
          title: 'Mask Party 2026 // Fila de Espera',
          text: shareText,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-300">
      {/* ALERTA DE SUCESSO (NO-PRINT) */}
      <div
        className={`no-print p-4 mb-4 border-2 font-bold uppercase text-xs flex items-center gap-3 ${
          alreadyRegistered
            ? 'bg-yellow-ascend text-black border-black shadow-[4px_4px_0px_0px_#000]'
            : 'bg-[#FF5722] text-black border-white shadow-[4px_4px_0px_0px_#fff]'
        }`}
      >
        {alreadyRegistered ? (
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        )}
        <div className="leading-snug">
          <strong>
            {alreadyRegistered ? 'CADASTRO JÁ EXISTENTE!' : 'CADASTRO CONFIRMADO COM SUCESSO!'}
          </strong>
          <span className="block text-[11px] font-mono normal-case mt-0.5">
            {alreadyRegistered
              ? 'Localizamos o seu registro anterior no banco de dados. Sua posição foi mantida.'
              : 'Sua prioridade na fila está salva. Guarde ou imprima o seu bilhete abaixo.'}
          </span>
        </div>
      </div>

      {/* BILHETE ESTILO CARAVANA ASCEND */}
      <div className="print-only-ticket bg-white text-black border-4 border-black shadow-[8px_8px_0px_0px_#FF5722] relative overflow-hidden">
        {/* Top Header do Ticket */}
        <div className="bg-black text-white p-4 flex items-center justify-between border-b-2 border-black">
          <div>
            <span className="text-[10px] tracking-widest text-[#FF5722] font-mono uppercase block">
              // OFFICIAL WAITING PASS
            </span>
            <h3 className="ascend-font text-3xl tracking-tight text-white uppercase leading-none mt-0.5">
              MASK PARTY <span className="text-yellow-ascend">2026</span>
            </h3>
          </div>
          <div className="text-right">
            <span className="inline-block bg-[#FF5722] text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-wider font-mono">
              PRIORIDADE
            </span>
            <p className="text-[9px] text-zinc-400 font-mono mt-1">1º LOTE</p>
          </div>
        </div>

        {/* Informações Centrais */}
        <div className="p-6">
          {/* Posição na Fila em Destaque Absoluto */}
          <div className="bg-zinc-100 border-2 border-black p-4 text-center my-2 relative">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block mb-1">
              SUA POSIÇÃO IMUTÁVEL NA FILA
            </span>
            <div className="ascend-font text-6xl sm:text-7xl text-[#FF5722] leading-none tracking-tighter">
              #{formattedPosition}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-[10px] uppercase bg-black text-white font-mono px-2 py-0.5 font-bold">
                ORDEM CRONOLÓGICA
              </span>
              <span className="text-[10px] uppercase bg-yellow-ascend text-black font-mono px-2 py-0.5 font-bold">
                STATUS: ATIVO
              </span>
            </div>
          </div>

          {/* Dados do Participante */}
          <div className="border-y-2 border-dashed border-black py-4 my-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-zinc-500 font-sans">Participante:</span>
              <strong className="uppercase font-mono text-sm">{name}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-zinc-500 font-sans">WhatsApp:</span>
              <span className="font-mono">{phone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-zinc-500 font-sans">E-mail:</span>
              <span className="font-mono text-[11px] truncate max-w-[210px]">{email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase text-zinc-500 font-sans">Registro:</span>
              <span className="font-mono text-[11px]">
                {new Date(createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="text-center my-4">
            <div className="inline-block p-2 border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code da Fila" className="w-44 h-44 mx-auto" />
              ) : (
                <div className="w-44 h-44 bg-zinc-200 animate-pulse flex items-center justify-center text-xs font-mono">
                  Gerando QR...
                </div>
              )}
            </div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase mt-2 font-mono">
              QR Code Oficial de Validação do Bilhete
            </p>
          </div>

          {/* Próximos Passos */}
          <div className="bg-[#050505] text-white p-3.5 border border-black text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-yellow-ascend font-black uppercase text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              <span>O que acontece agora?</span>
            </div>
            <ul className="text-zinc-300 text-[11px] space-y-1 list-disc list-inside leading-snug">
              <li>Na abertura do 1º lote, você receberá a notificação com link PIX no WhatsApp.</li>
              <li>O link possui prazo de expiração: efetue o pagamento para garantir o ingresso.</li>
              <li>Após aprovação, você recebe seu ingresso oficial com Dress Code e endereço secreto.</li>
            </ul>
          </div>
        </div>

        {/* Rodapé com Ações (no-print) */}
        <div className="no-print p-4 bg-zinc-100 border-t-2 border-black space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="w-full bg-black hover:bg-zinc-800 text-white font-black py-3 px-3 uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-2 border-black transition-colors"
            >
              <Printer className="w-4 h-4 text-yellow-ascend" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full bg-[#FF5722] hover:bg-orange-600 text-black font-black py-3 px-3 uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-2 border-black transition-colors shadow-[2px_2px_0px_0px_#000]"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="w-full bg-white hover:bg-zinc-200 text-black border border-black font-bold py-2.5 px-4 uppercase text-[11px] tracking-wider transition-colors"
            >
              Novo cadastro ou consulta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
