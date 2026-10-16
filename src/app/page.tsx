'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { QueueForm } from '@/components/QueueForm';
import { TicketBadge } from '@/components/TicketBadge';
import { CheckStatusModal } from '@/components/CheckStatusModal';
import { CampaignQrModal } from '@/components/CampaignQrModal';
import { EventBranding } from '@/components/EventBranding';
import { FaqSection } from '@/components/FaqSection';
import { QueueResponse } from '@/types/database';
import { ShieldCheck, Zap, Bell, QrCode, ArrowDown, Lock, Sparkles } from 'lucide-react';

export default function Home() {
  const [ticketData, setTicketData] = useState<NonNullable<QueueResponse['data']> | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isCampaignQrOpen, setIsCampaignQrOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FF5722] selection:text-black flex flex-col relative overflow-x-hidden">
      {/* Background shape texture overlay (idêntico ao Caravana Ascend) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] bg-no-repeat bg-cover bg-center"
        style={{ backgroundImage: "url('/img/background shape.png')" }}
      />

      <Navbar 
        onOpenCheckStatus={() => setIsCheckModalOpen(true)} 
        onOpenCampaignQr={() => setIsCampaignQrOpen(true)}
      />

      <main className="flex-1 z-10 px-4 py-8 md:py-16 max-w-6xl mx-auto w-full">
        {/* HERO SECTION */}
        <section className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-3 py-1 mb-6 text-[10px] uppercase font-mono tracking-widest text-[#FF5722]">
            <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />
            <span>CAMPANHA: THE WAITING QUEUE // 1º LOTE</span>
          </div>

          <h1 className="ascend-font text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter uppercase leading-[0.88] text-white">
            MASK <span className="text-[#FF5722]">PARTY</span>
          </h1>

          <p className="mt-4 text-xs sm:text-sm md:text-base font-mono uppercase tracking-widest text-zinc-400 max-w-2xl mx-auto">
            Fila de espera com carimbo imutável. Os primeiros cadastrados recebem o link de compra com prioridade absoluta.
          </p>

          {/* Destaques Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 max-w-3xl mx-auto mt-8 font-mono text-left">
            <div className="p-3 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">1º LOTE</span>
              <strong className="text-sm md:text-base text-yellow-ascend uppercase font-black">17/10/2026</strong>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">PAGAMENTO</span>
              <strong className="text-sm md:text-base text-white uppercase font-black">PIX AUTOMÁTICO</strong>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">NOTIFICAÇÃO</span>
              <strong className="text-sm md:text-base text-[#FF5722] uppercase font-black">WHATSAPP / EMAIL</strong>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">ENTREGA</span>
              <strong className="text-sm md:text-base text-white uppercase font-black">QR PASS + GUIA</strong>
            </div>
          </div>
        </section>

        {/* ÁREA PRINCIPAL: FORMULÁRIO OU TICKET DE CONFIRMAÇÃO */}
        <section className="mb-20">
          {ticketData ? (
            <TicketBadge
              queuePosition={ticketData.queue_position}
              name={ticketData.name}
              phone={ticketData.phone}
              email={ticketData.email}
              createdAt={ticketData.created_at}
              alreadyRegistered={ticketData.already_registered}
              onReset={() => setTicketData(null)}
            />
          ) : (
            <QueueForm onSuccess={(data) => setTicketData(data)} />
          )}
        </section>

        {/* SEÇÃO DE BRANDING DO EVENTO (EPIC 1 - USER STORY 2) */}
        <EventBranding />

        {/* FLUXO PASSO A PASSO (CONFORME O DEBRIEF) */}
        <section className="border-t border-zinc-800 pt-16 pb-12">
          <div className="text-center mb-12">
            <span className="text-[10px] font-mono text-[#FF5722] uppercase tracking-widest block mb-1">
              // ARQUITETURA DO PROCESSO
            </span>
            <h2 className="ascend-font text-3xl md:text-5xl uppercase tracking-tight text-white">
              COMO FUNCIONA O <span className="text-yellow-ascend">SISTEMA</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border-2 border-zinc-800 p-6 relative">
              <div className="ascend-font text-3xl text-[#FF5722] mb-3">01</div>
              <h4 className="font-bold uppercase text-sm tracking-wide mb-2 text-white">Inscrição na Fila</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Você cadastra seu WhatsApp e e-mail. A data e hora exatas determinam sua posição imutável.
              </p>
            </div>

            <div className="bg-zinc-950 border-2 border-zinc-800 p-6 relative">
              <div className="ascend-font text-3xl text-yellow-ascend mb-3">02</div>
              <h4 className="font-bold uppercase text-sm tracking-wide mb-2 text-white">Liberação por Lotes</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Na abertura do lote, o sistema notifica os primeiros da fila com link exclusivo de pagamento.
              </p>
            </div>

            <div className="bg-zinc-950 border-2 border-zinc-800 p-6 relative">
              <div className="ascend-font text-3xl text-white mb-3">03</div>
              <h4 className="font-bold uppercase text-sm tracking-wide mb-2 text-white">Pagamento PIX</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                PIX com QR Code dinâmico e tempo de expiração seguro. Sem pagamento a tempo, a vaga passa para o próximo.
              </p>
            </div>

            <div className="bg-zinc-950 border-2 border-zinc-800 p-6 relative">
              <div className="ascend-font text-3xl text-[#FF5722] mb-3">04</div>
              <h4 className="font-bold uppercase text-sm tracking-wide mb-2 text-white">Ingresso & Dress Code</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Com a compensação antifraude, seu ingresso digital com QR Code e manual de instruções são liberados.
              </p>
            </div>
          </div>
        </section>

        {/* SEÇÃO FAQ */}
        <FaqSection />
      </main>

      {/* FOOTER */}
      <footer className="no-print border-t-2 border-white/10 bg-black py-8 px-4 text-center font-mono text-[11px] text-zinc-500 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#FF5722]" />
            <span className="text-zinc-300 uppercase font-black">MASK PARTY // GESTÃO DE ACESSOS</span>
          </div>

          <div className="flex items-center gap-4 text-[10px] uppercase">
            <span>Powered by Supabase</span>
            <span>•</span>
            <span>Deployed on Vercel</span>
            <span>•</span>
            <span>Anti-Fraud Engine</span>
          </div>
        </div>
      </footer>

      {/* Modal de Busca de Posição */}
      <CheckStatusModal
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        onFound={(data) => setTicketData(data)}
      />

      {/* Modal de QR Code de Divulgação (Marketing / Posters) */}
      <CampaignQrModal
        isOpen={isCampaignQrOpen}
        onClose={() => setIsCampaignQrOpen(false)}
      />
    </div>
  );
}
