'use client';

import React from 'react';
import Link from 'next/link';
import { ListOrdered, BarChart3, Ticket, ScanLine, ScrollText, type LucideIcon } from 'lucide-react';

export type AdminTab = 'queue' | 'analytics' | 'lots' | 'checkin' | 'logs';

interface AdminNavTabsProps {
  activeTab: AdminTab;
}

const TABS: Array<{ id: AdminTab; href: string; label: string; shortLabel: string; Icon: LucideIcon }> = [
  { id: 'queue', href: '/admin', label: 'Gestão da Lista', shortLabel: 'Lista', Icon: ListOrdered },
  { id: 'analytics', href: '/admin/analytics', label: 'Métricas & Conversão', shortLabel: 'Métricas', Icon: BarChart3 },
  { id: 'lots', href: '/admin/lots', label: 'Lotes & Preços', shortLabel: 'Lotes', Icon: Ticket },
  { id: 'checkin', href: '/admin/checkin', label: 'Portaria / Check-in', shortLabel: 'Portaria', Icon: ScanLine },
  { id: 'logs', href: '/admin/logs', label: 'Logs', shortLabel: 'Logs', Icon: ScrollText },
];

/**
 * Navegação do admin.
 * - Desktop (md+): abas horizontais no cabeçalho, como antes.
 * - Celular: ilha flutuante fixa no rodapé, só com ícones (estilo dock do iPhone).
 *   As páginas usam `pb-28 md:pb-8` no container para o conteúdo não ficar atrás da ilha.
 */
export function AdminNavTabs({ activeTab }: AdminNavTabsProps) {
  return (
    <>
      {/* DESKTOP: abas no cabeçalho */}
      <div className="hidden md:flex items-center gap-2 font-data text-xs mt-6">
        {TABS.map(({ id, href, label, Icon }) =>
          activeTab === id ? (
            <div
              key={id}
              className="px-4 py-2.5 bg-[#8A3CFF] text-[#0B0B0D] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
            >
              <Icon className="w-3.5 h-3.5 text-[#0B0B0D]" />
              <span>{label}</span>
            </div>
          ) : (
            <Link
              key={id}
              href={href}
              className="px-4 py-2.5 bg-[#141418] hover:bg-[#1A1A20] text-[#5B5B66] hover:text-[#E8E8EF] border border-[#1F1F24] hover:border-[#8A3CFF]/50 uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <Icon className="w-3.5 h-3.5 text-[#8A3CFF]" />
              <span>{label}</span>
            </Link>
          )
        )}
      </div>

      {/* CELULAR: ilha flutuante no rodapé */}
      <nav
        aria-label="Navegação do admin"
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#141418]/85 backdrop-blur-xl border border-[#2A2A33] shadow-[0_10px_40px_rgba(0,0,0,0.6)] font-data">
          {TABS.map(({ id, href, shortLabel, Icon }) => {
            const active = activeTab === id;
            return (
              <Link
                key={id}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-full transition-all ${
                  active ? 'bg-[#8A3CFF] text-[#0B0B0D]' : 'text-[#8C8C9A] active:bg-[#1F1F24]'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#0B0B0D]' : 'text-[#B48CFF]'}`} />
                <span className={`text-[9px] uppercase tracking-wide leading-none ${active ? 'font-bold' : ''}`}>{shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
