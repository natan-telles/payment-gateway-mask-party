'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { TicketBadge } from '@/components/TicketBadge';
import { CheckStatusModal } from '@/components/CheckStatusModal';
import { JoinQueueModal } from '@/components/JoinQueueModal';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';
import { QueueResponse } from '@/types/database';
import { ChevronDown, ChevronUp, Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [ticketData, setTicketData] = useState<NonNullable<QueueResponse['data']> | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'regras' | 'faq' | null>(null);

  const toggleTab = (tab: 'info' | 'regras' | 'faq') => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex flex-col justify-between selection:bg-[#8A3CFF] selection:text-white relative">
      <Navbar onOpenCheckStatus={() => setIsCheckModalOpen(true)} />

      {/* CONTEÚDO PRINCIPAL (CLEAN & SEM ARRASTO NO MOBILE) */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 md:py-12 w-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* COLUNA ESQUERDA: BRANDING, HEADLINE & VIBE DO BAILE */}
          <div className="lg:col-span-6 flex flex-col justify-center animate-stack-1">
            {/* Tagline de topo */}
            <div className="flex items-center gap-2 mb-2 font-data text-[10px] text-[#8A3CFF] uppercase tracking-widest">
              <span>EDICÃO ANUAL</span>
              <span className="text-[#5B5B66]">·</span>
              <span>SÁBADO 31 DE OUTUBRO</span>
            </div>

            {/* Subtítulo em Ultravioleta */}
            <span className="font-persona text-2xl sm:text-3xl tracking-widest text-[#8A3CFF] uppercase block leading-none">
              A NOITE DAS MÁSCARAS
            </span>

            {/* Wordmark Principal BAILE DA LAGOA em Anton Cromo */}
            <h1 className="font-persona text-6xl sm:text-7xl md:text-8xl text-[#E8E8EF] tracking-tight leading-[0.88] uppercase mb-4">
              BAILE DA <span className="text-[#E8E8EF]">LAGOA</span>
            </h1>

            {/* Dados do Flyer em Space Mono */}
            <div className="font-data text-xs sm:text-sm text-[#5B5B66] uppercase tracking-wider mb-6">
              31.10 — 20H ATÉ DE MADRUGADA — SJC
            </div>

            {/* Regra de Ouro (Copy Seco e Direto Oficial da Marca) */}
            <div className="border-l-2 border-[#8A3CFF] pl-4 py-1 mb-6 animate-stack-2">
              <h2 className="font-persona text-xl sm:text-2xl text-[#E8E8EF] uppercase tracking-wide leading-tight">
                UMA FESTA. UMA REGRA.
                <br />
                <span className="text-[#FF2E3B]">NINGUÉM ENTRA DE CARA LIMPA.</span>
              </h2>
              <p className="font-data text-[11px] text-[#5B5B66] uppercase tracking-wide mt-2 leading-relaxed">
                O baile de máscaras da cidade. Uma noite por ano. Você não sabe quem está do seu lado, e é isso que faz a noite.
              </p>
            </div>

            {/* Pilulas de Informação Rápida (The Stack Style) */}
            <div className="grid grid-cols-3 gap-2 font-data text-[10px] uppercase text-[#E8E8EF] mb-4 animate-stack-3">
              <div className="bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF]/40 p-2.5 text-center transition-all duration-200">
                <span className="text-[#5B5B66] block text-[8px] mb-0.5">OPEN BAR</span>
                <strong className="text-[#8A3CFF]">NOITE TODA</strong>
              </div>
              <div className="bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF]/40 p-2.5 text-center transition-all duration-200">
                <span className="text-[#5B5B66] block text-[8px] mb-0.5">SOM</span>
                <span>DJ SET ATÉ 05H</span>
              </div>
              <div className="bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF]/40 p-2.5 text-center transition-all duration-200">
                <span className="text-[#5B5B66] block text-[8px] mb-0.5">ACESSO</span>
                <span className="text-[#FF2E3B] font-bold">1º LOTE</span>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: CARD DE AÇÃO LIMPO OU BILHETE */}
          <div className="lg:col-span-6 w-full">
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
              <div className="bg-[#141418] border border-[#1F1F24] p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden animate-stack-2">
                {/* Linha decorativa de topo Ultravioleta */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8A3CFF] via-[#FF2E3B] to-[#8A3CFF]" />

                {/* Status da Fila */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1F1F24]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8A3CFF] pulse-livestream" />
                    <span className="font-data text-[10px] text-[#E8E8EF] uppercase tracking-widest font-bold">
                      PRÉ-VENDA ABERTA
                    </span>
                  </div>
                  <span className="font-data text-[9px] text-[#8A3CFF] bg-[#8A3CFF]/10 px-2 py-0.5 border border-[#8A3CFF]/20 uppercase tracking-widest">
                    LOTE 01
                  </span>
                </div>

                {/* Conteúdo Central do Card */}
                <div className="space-y-4 my-2">
                  <div className="flex items-center gap-3">
                    <PersonaMaskIcon className="w-8 h-5" fillColor="#8A3CFF" />
                    <span className="font-persona text-2xl uppercase tracking-wider text-[#E8E8EF]">
                      ACESSO ANTECIPADO
                    </span>
                  </div>

                  <p className="font-data text-xs text-[#5B5B66] uppercase leading-relaxed tracking-wide">
                    Garanta prioridade na compra antes da abertura ao público geral. Vagas limitadas para o 1º lote.
                  </p>

                  <div className="bg-[#0B0B0D] border border-[#1F1F24] p-3 text-[11px] font-data text-[#E8E8EF] flex items-center justify-between">
                    <span className="text-[#5B5B66]">VALOR DE ENTRADA NA FILA:</span>
                    <strong className="text-[#8A3CFF]">GRATUITO (R$ 0,00)</strong>
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL DE AÇÃO: DISPARA O MODAL */}
                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="w-full bg-[#FF2E3B] hover:bg-[#ff424e] active:scale-[0.99] text-[#E8E8EF] font-persona text-xl sm:text-2xl uppercase py-4 px-6 tracking-wider flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_0_25px_rgba(255,46,59,0.3)] hover:shadow-[0_0_35px_rgba(255,46,59,0.5)] cursor-pointer"
                  >
                    <span>ENTRAR NA FILA DO 1º LOTE</span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </button>

                  <div className="flex items-center justify-between text-[10px] font-data text-[#5B5B66] uppercase px-1 pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#8A3CFF]" />
                      Confirmação via WhatsApp e E-mail
                    </span>
                    <button
                      onClick={() => setIsCheckModalOpen(true)}
                      className="text-[#8A3CFF] hover:underline"
                    >
                      Já se cadastrou?
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACCORDION COMPACTO DE DETALHES (ZERO SCROLL FATIGUE) */}
        <div className="mt-8 pt-6 border-t border-[#1F1F24] max-w-3xl mx-auto w-full font-data text-xs animate-stack-4">
          <div className="flex items-center justify-between mb-3 text-[10px] uppercase text-[#5B5B66]">
            <span>// GUIA DO BAILE</span>
            <span>TOQUE PARA VER DETALHES</span>
          </div>

          <div className="space-y-2">
            {/* O QUE ROLA */}
            <div className="bg-[#141418] border border-[#1F1F24] hover:border-[#2A2A32] transition-colors">
              <button
                onClick={() => toggleTab('info')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs uppercase font-bold text-[#E8E8EF] hover:text-[#8A3CFF] transition-colors"
              >
                <span>01 · O QUE ROLA</span>
                {activeTab === 'info' ? <ChevronUp className="w-4 h-4 text-[#8A3CFF]" /> : <ChevronDown className="w-4 h-4 text-[#5B5B66]" />}
              </button>
              {activeTab === 'info' && (
                <div className="px-4 pb-4 pt-1 text-[#5B5B66] border-t border-[#1F1F24] space-y-1.5 text-[11px] leading-relaxed animate-in fade-in duration-200">
                  <p>· DJ set até de madrugada (House, Melodic, Dark Disco).</p>
                  <p>· Bar aberto a noite toda.</p>
                  <p>· Máscara obrigatória durante todo o evento.</p>
                  <p>· Local secreto em São José dos Campos revelado no bilhete oficial.</p>
                </div>
              )}
            </div>

            {/* DRESS CODE & REGRA */}
            <div className="bg-[#141418] border border-[#1F1F24] hover:border-[#2A2A32] transition-colors">
              <button
                onClick={() => toggleTab('regras')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs uppercase font-bold text-[#E8E8EF] hover:text-[#FF2E3B] transition-colors"
              >
                <span>02 · A REGRA DA MÁSCARA</span>
                {activeTab === 'regras' ? <ChevronUp className="w-4 h-4 text-[#FF2E3B]" /> : <ChevronDown className="w-4 h-4 text-[#5B5B66]" />}
              </button>
              {activeTab === 'regras' && (
                <div className="px-4 pb-4 pt-1 text-[#5B5B66] border-t border-[#1F1F24] space-y-1.5 text-[11px] leading-relaxed animate-in fade-in duration-200">
                  <p className="text-[#E8E8EF] font-bold">SEM MÁSCARA, SEM ENTRADA.</p>
                  <p>Qualquer máscara vale: veneziana, moderna, avant-garde. Compre, faça ou improvise. Só não chega de cara limpa.</p>
                  <p>Paleta sugerida: All Black & Dark Minimalist.</p>
                </div>
              )}
            </div>

            {/* COMO FUNCIONA A PRÉ-VENDA */}
            <div className="bg-[#141418] border border-[#1F1F24] hover:border-[#2A2A32] transition-colors">
              <button
                onClick={() => toggleTab('faq')}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs uppercase font-bold text-[#E8E8EF] hover:text-[#8A3CFF] transition-colors"
              >
                <span>03 · COMO FUNCIONA O LOTE 1</span>
                {activeTab === 'faq' ? <ChevronUp className="w-4 h-4 text-[#8A3CFF]" /> : <ChevronDown className="w-4 h-4 text-[#5B5B66]" />}
              </button>
              {activeTab === 'faq' && (
                <div className="px-4 pb-4 pt-1 text-[#5B5B66] border-t border-[#1F1F24] space-y-2 text-[11px] leading-relaxed animate-in fade-in duration-200">
                  <p><strong className="text-[#E8E8EF]">Prioridade na pré-venda:</strong> Quem se cadastra primeiro recebe o acesso ao 1º Lote direto no WhatsApp e e-mail com chave PIX exclusiva.</p>
                  <p><strong className="text-[#E8E8EF]">Inscrição gratuita:</strong> Entrar na lista de pré-venda não tem nenhum custo.</p>
                  <p><strong className="text-[#E8E8EF]">Tempo limite de pagamento:</strong> Cada liberação possui um prazo de validade. Não pagando dentro do prazo, a vaga passa para o próximo da lista.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="no-print border-t border-[#1F1F24] py-4 px-4 font-data text-[10px] text-[#5B5B66] uppercase">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <PersonaMaskIcon className="w-4 h-2.5" fillColor="#8A3CFF" />
            <span>BAILE DA LAGOA · 31.10 · SJC</span>
          </div>

          <div className="flex items-center gap-3">
            <span>SEM MÁSCARA, SEM ENTRADA</span>
            <span>·</span>
            <Link
              href="/admin"
              className="text-[#5B5B66] hover:text-[#8A3CFF] flex items-center gap-1 transition-colors"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </footer>

      {/* MODAL DE CADASTRO / ENTRAR NA FILA */}
      <JoinQueueModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={(data) => setTicketData(data)}
      />

      {/* MODAL DE CONSULTA DE LUGAR */}
      <CheckStatusModal
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        onFound={(data) => setTicketData(data)}
      />
    </div>
  );
}
