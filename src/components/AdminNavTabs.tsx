'use client';

import React from 'react';
import Link from 'next/link';
import { ListOrdered, BarChart3, Ticket } from 'lucide-react';

interface AdminNavTabsProps {
  activeTab: 'queue' | 'analytics' | 'lots';
}

export function AdminNavTabs({ activeTab }: AdminNavTabsProps) {
  return (
    <div className="flex items-center gap-2 font-data text-xs mt-6">
      {/* Aba 1: Fila de Espera */}
      {activeTab === 'queue' ? (
        <div className="px-4 py-2.5 bg-[#8A3CFF] text-[#0B0B0D] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md">
          <ListOrdered className="w-3.5 h-3.5 text-[#0B0B0D]" />
          <span>Gestão da Lista</span>
        </div>
      ) : (
        <Link
          href="/admin"
          className="px-4 py-2.5 bg-[#141418] hover:bg-[#1A1A20] text-[#5B5B66] hover:text-[#E8E8EF] border border-[#1F1F24] hover:border-[#8A3CFF]/50 uppercase tracking-wider transition-all flex items-center gap-2"
        >
          <ListOrdered className="w-3.5 h-3.5 text-[#8A3CFF]" />
          <span>Gestão da Lista</span>
        </Link>
      )}

      {/* Aba 2: Métricas & Analytics */}
      {activeTab === 'analytics' ? (
        <div className="px-4 py-2.5 bg-[#8A3CFF] text-[#0B0B0D] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md">
          <BarChart3 className="w-3.5 h-3.5 text-[#0B0B0D]" />
          <span>Métricas & Conversão</span>
        </div>
      ) : (
        <Link
          href="/admin/analytics"
          className="px-4 py-2.5 bg-[#141418] hover:bg-[#1A1A20] text-[#5B5B66] hover:text-[#E8E8EF] border border-[#1F1F24] hover:border-[#8A3CFF]/50 uppercase tracking-wider transition-all flex items-center gap-2"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#8A3CFF]" />
          <span>Métricas & Conversão</span>
        </Link>
      )}

      {/* Aba 3: Lotes & Preços */}
      {activeTab === 'lots' ? (
        <div className="px-4 py-2.5 bg-[#8A3CFF] text-[#0B0B0D] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md">
          <Ticket className="w-3.5 h-3.5 text-[#0B0B0D]" />
          <span>Lotes & Preços</span>
        </div>
      ) : (
        <Link
          href="/admin/lots"
          className="px-4 py-2.5 bg-[#141418] hover:bg-[#1A1A20] text-[#5B5B66] hover:text-[#E8E8EF] border border-[#1F1F24] hover:border-[#8A3CFF]/50 uppercase tracking-wider transition-all flex items-center gap-2"
        >
          <Ticket className="w-3.5 h-3.5 text-[#8A3CFF]" />
          <span>Lotes & Preços</span>
        </Link>
      )}
    </div>
  );
}
