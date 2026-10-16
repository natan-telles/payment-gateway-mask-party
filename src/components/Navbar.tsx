'use client';

import React from 'react';
import { PersonaMaskIcon } from './PersonaMaskIcon';
import { Search } from 'lucide-react';

interface NavbarProps {
  onOpenCheckStatus: () => void;
  onOpenInfo?: () => void;
}

export function Navbar({ onOpenCheckStatus, onOpenInfo }: NavbarProps) {
  return (
    <header className="no-print w-full border-b border-[#1F1F24] bg-[#0B0B0D]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand & Símbolo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#8A3CFF] flex items-center justify-center p-1.5 flex-shrink-0 transition-transform hover:scale-105 duration-200">
            <PersonaMaskIcon className="w-full h-full" fillColor="#0B0B0D" />
          </div>
          <div>
            <span className="font-persona text-xl tracking-tight text-[#E8E8EF] block leading-none">
              BAILE DA LAGOA
            </span>
            <span className="font-data text-[9px] text-[#5B5B66] uppercase tracking-widest block mt-0.5">
              31.10 · SJC
            </span>
          </div>
        </div>

        {/* Live indicator & Ações */}
        <div className="flex items-center gap-3 font-data text-xs">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#141418] border border-[#1F1F24] text-[9px] text-[#E8E8EF] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8A3CFF] pulse-livestream" />
            <span>PRÉ-VENDA ATIVA</span>
          </div>

          <button
            onClick={onOpenCheckStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1F1F24] hover:border-[#8A3CFF] bg-[#141418] hover:bg-[#1A1A20] text-[#E8E8EF] text-[10px] uppercase transition-all duration-200"
          >
            <Search className="w-3 h-3 text-[#8A3CFF]" />
            <span>Consultar Lugar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
