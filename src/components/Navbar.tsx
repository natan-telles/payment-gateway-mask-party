'use client';

import React from 'react';
import { Search, QrCode } from 'lucide-react';

interface NavbarProps {
  onOpenCheckStatus: () => void;
  onOpenCampaignQr: () => void;
}

export function Navbar({ onOpenCheckStatus, onOpenCampaignQr }: NavbarProps) {
  return (
    <header className="no-print w-full border-b-2 border-white/10 bg-black/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-[#FF5722] rotate-45 shadow-[0_0_10px_#FF5722]"></div>
          <div>
            <span className="ascend-font text-2xl md:text-3xl tracking-tighter text-white uppercase block leading-none">
              MASK <span className="text-[#FF5722]">PARTY</span>
            </span>
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block">
              WAITING QUEUE // PRE-ORDER
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenCampaignQr}
            className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-yellow-ascend px-3 py-1.5 text-xs font-mono uppercase transition-colors"
            title="Gerar QR Code de Campanha para Cartazes e Redes"
          >
            <QrCode className="w-3.5 h-3.5 text-yellow-ascend" />
            <span className="hidden sm:inline">QR de Divulgação</span>
            <span className="sm:hidden">QR</span>
          </button>

          <button
            onClick={onOpenCheckStatus}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-[#FF5722] px-3 py-1.5 text-xs font-mono uppercase transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#FF5722]" />
            <span className="hidden sm:inline">Consultar Posição</span>
            <span className="sm:hidden">Consultar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
