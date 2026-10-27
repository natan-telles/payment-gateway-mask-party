'use client';

import { CheckStatusModal } from '@/components/CheckStatusModal';
import { Countdown } from '@/components/Countdown';
import { JoinQueueModal } from '@/components/JoinQueueModal';
import { Navbar } from '@/components/Navbar';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';
import { Reveal } from '@/components/Reveal';
import { ShareSiteQrModal } from '@/components/ShareSiteQrModal';
import { TicketBadge } from '@/components/TicketBadge';
import { LotLabels, useCurrentLot } from '@/hooks/useCurrentLot';
import { QueueResponse } from '@/types/database';
import { ArrowRight, Check, ChevronDown, Eye, Lock, MapPin, Music, QrCode, ShieldCheck } from 'lucide-react';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

import crowdRed from '../../public/img/masquerade/crowd-red.jpg';
import crowdStage from '../../public/img/masquerade/crowd-stage.jpg';
import crowdUv from '../../public/img/masquerade/crowd-uv.jpg';
import heroMask from '../../public/img/masquerade/hero-mask.png';
import maskDrink from '../../public/img/masquerade/mask-drink.jpg';
import maskRed from '../../public/img/masquerade/mask-red.jpg';
import maskedParty from '../../public/img/masquerade/masked-party.jpg';
import masksRow from '../../public/img/masquerade/masks-row.jpg';

type Tab = 'info' | 'regras' | 'faq';


const EXPERIENCE: Array<{
  img: StaticImageData;
  alt: string;
  icon: React.ElementType;
  index: string;
  label: string;
  title: string;
  text: string;
  tone?: 'red';
}> = [
  {
    img: crowdUv,
    alt: 'Multidão na pista sob luzes ultravioleta e fumaça',
    icon: Music,
    index: '01',
    label: 'O SOM',
    title: 'DJ SET ATÉ 03H',
    text: 'House, Melodic e Dark Disco a noite inteira. Bar sem álcool com 1 drink incluso no ingresso.',
  },
  {
    img: maskedParty,
    alt: 'Pessoas mascaradas na pista sob luzes roxas de palco',
    icon: Eye,
    index: '02',
    label: 'A REGRA',
    title: 'NINGUÉM ENTRA DE CARA LIMPA',
    text: 'Máscara obrigatória durante todo o evento. Veneziana, moderna ou avant-garde.',
  },
  {
    img: crowdRed,
    alt: 'Pessoas na pista iluminadas por luz vermelha',
    icon: MapPin,
    index: '03',
    label: 'O LOCAL',
    title: 'ENDEREÇO',
    text: 'Av. Gen. Motors, 1159 - Ronda, São José dos Campos - SP, 12221-842',
    tone: 'red',
  },
];

const buildMarquee = (lot: LotLabels) => ['SEM MÁSCARA, SEM ENTRADA', '31.10', 'SJC', lot.code, '1 DRINK INCLUSO', 'DJ SET ATÉ 03H'];

const buildGuide = (lot: LotLabels): Array<{ id: Tab; title: string; accent: string; content: React.ReactNode }> => [
  {
    id: 'info',
    title: '01 · O QUE ROLA',
    accent: '#8A3CFF',
    content: (
      <>
        <p>· DJ set até de madrugada (House, Melodic, Dark Disco).</p>
        <p>· Bar sem álcool: o ingresso inclui 1 drink.</p>
        <p>· Máscara obrigatória durante todo o evento.</p>
        <p>· Local: Av. Gen. Motors, 1159 - Ronda, São José dos Campos - SP, 12221-842.</p>
      </>
    ),
  },
  {
    id: 'regras',
    title: '02 · A REGRA DA MÁSCARA',
    accent: '#FF2E3B',
    content: (
      <>
        <p className="text-[#E8E8EF] font-bold">SEM MÁSCARA, SEM ENTRADA.</p>
        <p>Qualquer máscara vale: veneziana, moderna, avant-garde. Compre, faça ou improvise. Só não chega de cara limpa.</p>
        <p>Paleta sugerida: All Black & Dark Minimalist.</p>
      </>
    ),
  },
  {
    id: 'faq',
    title: `03 · COMO FUNCIONA O ${lot.name}`,
    accent: '#8A3CFF',
    content: (
      <>
        <p><strong className="text-[#E8E8EF]">Prioridade na pré-venda:</strong> Quem se cadastra primeiro recebe o acesso ao {lot.name} direto no WhatsApp e e-mail com chave PIX exclusiva.</p>
        <p><strong className="text-[#E8E8EF]">Inscrição gratuita:</strong> Entrar na lista de pré-venda não tem nenhum custo.</p>
        <p><strong className="text-[#E8E8EF]">Tempo limite de pagamento:</strong> Cada liberação possui um prazo de validade. Não pagando dentro do prazo, a vaga passa para o próximo da lista.</p>
      </>
    ),
  },
];

const DONE_TEXT = ['Feito. Seu lugar está garantido.', 'Feito. Liberação recebida.', 'Feito. Ingresso pago.'];

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-data text-[10px] uppercase tracking-widest mb-3">
      <span className="text-[#8A3CFF]">{'// '}{index}</span>
      <span className="h-px w-8 bg-[#1F1F24]" />
      <span className="text-[#5B5B66]">{children}</span>
    </div>
  );
}

export default function Home() {
  const [ticketData, setTicketData] = useState<NonNullable<QueueResponse['data']> | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isShareQrOpen, setIsShareQrOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const lot = useCurrentLot();
  const isPaid = ticketData?.payment_status === 'approved';
  const marqueeItems = buildMarquee(lot);
  const guide = buildGuide(lot);
  const heroRef = useRef<HTMLElement>(null);
  const accessRef = useRef<HTMLElement>(null);

  const toggleTab = (tab: Tab) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  // Quando o bilhete aparece (cadastro ou consulta), leva o usuário até ele
  useEffect(() => {
    if (ticketData) {
      accessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [ticketData]);

  // Parallax leve da máscara seguindo o mouse (só desktop, via CSS vars)
  const handleHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - rect.left) / rect.width - 0.5));
    el.style.setProperty('--my', String((e.clientY - rect.top) / rect.height - 0.5));
  };

  const openJoin = () => setIsJoinModalOpen(true);

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex flex-col selection:bg-[#8A3CFF] selection:text-white relative overflow-x-hidden">
      <Navbar onOpenCheckStatus={() => setIsCheckModalOpen(true)} />

      <main className="flex-1 w-full">
        {/* ============ HERO: MÁSCARA + WORDMARK ============ */}
        <section
          ref={heroRef}
          onMouseMove={handleHeroMove}
          className="relative min-h-[calc(100svh-56px)] flex items-center overflow-hidden"
        >
          {/* Foto da máscara com parallax */}
          <div
            className="absolute inset-0 transition-transform duration-700 ease-out"
            style={{
              transform:
                'translate3d(calc(var(--mx, 0) * -18px), calc(var(--my, 0) * -12px), 0) scale(1.06)',
            }}
          >
            <Image
              src={heroMask}
              alt="Máscara veneziana negra iluminada por luz ultravioleta e vermelha em meio à fumaça"
              fill
              preload
              placeholder="blur"
              sizes="100vw"
              className="object-cover object-[65%_center] lg:object-[center_center] opacity-55 lg:opacity-90"
            />
          </div>

          {/* Degradês para fundir a foto com a pista */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D] via-[#0B0B0D]/80 to-transparent lg:via-[#0B0B0D]/55" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0B0B0D] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0B0B0D]/80 to-transparent" />

          {/* Luzes flutuantes */}
          <div className="glow-uv w-[420px] h-[420px] -left-32 top-10" />
          <div className="glow-red w-[360px] h-[360px] right-0 bottom-0" />

          {/* Marcas de flyer nos cantos */}
          <div className="hidden md:block absolute top-6 right-6 font-data text-[9px] text-[#5B5B66] uppercase tracking-widest text-right">
            <span className="block">23°11&apos;S · 45°53&apos;W</span>
            <span className="block text-[#8A3CFF]">LOC: AV. GEN. MOTORS, 1159 · RONDA</span>
          </div>
          <div className="hidden md:block absolute bottom-6 right-6 font-data text-[9px] text-[#5B5B66] uppercase tracking-widest">
            ED. ANUAL // Nº 01
          </div>

          <div className="relative max-w-6xl mx-auto px-4 py-16 w-full">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3 font-data text-[10px] text-[#8A3CFF] uppercase tracking-widest animate-stack-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A3CFF] pulse-livestream" />
                <span>EDICÃO ANUAL</span>
                <span className="text-[#5B5B66]">·</span>
                <span>SÁBADO 31 DE OUTUBRO</span>
              </div>

              <span className="font-persona text-2xl sm:text-3xl tracking-widest text-[#8A3CFF] uppercase block leading-none animate-stack-1">
                A NOITE DAS MÁSCARAS
              </span>

              <h1
                data-text="BAILE DA LAGOA"
                className="glitch glitch-intro font-persona text-7xl sm:text-8xl md:text-9xl text-[#E8E8EF] tracking-tight leading-[0.86] uppercase mb-5 animate-stack-2 drop-shadow-[0_0_30px_rgba(138,60,255,0.25)]"
              >
                BAILE DA LAGOA
              </h1>

              <div className="font-data text-xs sm:text-sm text-[#E8E8EF]/70 uppercase tracking-wider mb-7 animate-stack-2">
                31.10 — 20H ATÉ DE MADRUGADA — SJC
              </div>

              <div className="border-l-2 border-[#8A3CFF] pl-4 py-1 mb-8 animate-stack-3">
                <h2 className="font-persona text-xl sm:text-2xl text-[#E8E8EF] uppercase tracking-wide leading-tight">
                  UMA FESTA. UMA REGRA.
                  <br />
                  <span className="text-[#FF2E3B]">NINGUÉM ENTRA DE CARA LIMPA.</span>
                </h2>
                <p className="font-data text-[11px] text-[#E8E8EF]/55 uppercase tracking-wide mt-2 leading-relaxed">
                  O baile de máscaras da cidade. Uma noite por ano. Você não sabe quem está do seu lado, e é isso que faz a noite.
                </p>
              </div>

              <div className="mb-8 animate-stack-3">
                <span className="block font-data text-[9px] text-[#5B5B66] uppercase tracking-widest mb-2">
                  {'// '}A PISTA ABRE EM
                </span>
                <Countdown />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 animate-stack-4">
                <button
                  onClick={openJoin}
                  className="cta-neon bg-[#FF2E3B] hover:bg-[#ff424e] active:scale-[0.99] text-[#E8E8EF] font-persona text-xl uppercase py-4 px-6 tracking-wider flex items-center justify-center gap-3 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8E8EF]"
                >
                  <span>ENTRAR NA FILA DO {lot.name}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsCheckModalOpen(true)}
                  className="border border-[#5B5B66]/60 hover:border-[#8A3CFF] bg-[#0B0B0D]/60 backdrop-blur-sm text-[#E8E8EF] font-data text-[11px] uppercase tracking-widest py-4 px-5 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A3CFF]"
                >
                  Já se cadastrou? Consultar lugar
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 font-data text-[9px] text-[#5B5B66] uppercase tracking-widest">
            <span>ROLE</span>
            <ChevronDown className="w-4 h-4 animate-bounce text-[#8A3CFF]" />
          </div>
        </section>

        {/* ============ LETREIRO ============ */}
        <div className="relative border-y border-[#1F1F24] bg-[#141418] overflow-hidden py-3" aria-hidden>
          <div className="flex w-max animate-marquee font-data text-[11px] uppercase tracking-[0.3em] text-[#E8E8EF]/80">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0">
                {[...marqueeItems, ...marqueeItems].map((item, i) => (
                  <span key={`${copy}-${i}`} className="flex items-center gap-6 px-6">
                    <span className={item === 'SEM MÁSCARA, SEM ENTRADA' ? 'text-[#FF2E3B]' : ''}>{item}</span>
                    <PersonaMaskIcon className="w-4 h-2.5" fillColor="#8A3CFF" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ============ ACESSO: CARD DA FILA OU BILHETE ============ */}
        <section ref={accessRef} id="acesso" className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 scroll-mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <Reveal className="lg:col-span-6">
              {/* Com o bilhete na tela, o texto confirma o lugar em vez de pedir cadastro */}
              <SectionLabel index="01">
                {isPaid ? 'INGRESSO PAGO' : ticketData ? 'LUGAR RESERVADO' : 'ACESSO ANTECIPADO'}
              </SectionLabel>
              <h2 className="font-persona text-5xl sm:text-6xl uppercase leading-[0.9] tracking-tight mb-5">
                {isPaid ? 'SEU INGRESSO' : ticketData ? 'VOCÊ JÁ ESTÁ' : 'GARANTA SEU LUGAR'}
                <br />
                <span className="text-[#8A3CFF]">{isPaid ? 'ESTÁ CONFIRMADO' : `NA FILA DO ${lot.name}`}</span>
              </h2>
              <p className="font-data text-xs text-[#5B5B66] uppercase leading-relaxed tracking-wide mb-8 max-w-md">
                {isPaid
                  ? 'Pagamento aprovado. O ingresso oficial foi enviado para o seu e-mail. Nos vemos no baile, de máscara.'
                  : ticketData
                    ? `Sua prioridade está ativa. Quando o ${lot.name.toLowerCase()} for liberado, a chave PIX chega no seu WhatsApp e e-mail.`
                    : `Garanta prioridade na compra antes da abertura ao público geral. Vagas limitadas para o ${lot.name.toLowerCase()}.`}
              </p>

              {/* Pílulas em formato de canhoto de ingresso */}
              <div className="grid grid-cols-3 gap-2 font-data text-[10px] uppercase text-[#E8E8EF] mb-10">
                {[
                  { label: 'BAR', value: '1 DRINK INCLUSO', color: 'text-[#8A3CFF] font-bold' },
                  { label: 'SOM', value: 'DJ SET ATÉ 03H', color: '' },
                  { label: 'ACESSO', value: isPaid ? 'PAGO' : lot.name, color: 'text-[#FF2E3B] font-bold' },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className="ticket-stub bg-[#141418] border-y border-[#1F1F24] hover:bg-[#1A1A20] px-3 py-3.5 text-center transition-colors duration-200"
                  >
                    <span className="text-[#5B5B66] block text-[8px] mb-1 tracking-widest">{pill.label}</span>
                    <span className={pill.color}>{pill.value}</span>
                    <span className="block mx-auto mt-2 w-3/4 border-t border-dashed border-[#2A2A32]" />
                  </div>
                ))}
              </div>

              {/* Passo a passo */}
              <ol className="space-y-4 font-data text-[11px] uppercase tracking-wide">
                {[
                  ['ENTRE NA FILA', 'Cadastro gratuito, leva menos de um minuto.'],
                  ['RECEBA A LIBERAÇÃO', 'Chave PIX exclusiva no WhatsApp e no e-mail.'],
                  ['PAGUE NO PRAZO', 'Bilhete oficial com local e dresscode.'],
                ].map(([title, text], i) => {
                  // Na fila: etapa 1 cumprida. Pago: todas cumpridas
                  const done = isPaid || (Boolean(ticketData) && i === 0);
                  return (
                    <li key={title} className={`flex gap-4 items-start ${done ? 'opacity-60' : ''}`}>
                      {done ? (
                        <span className="w-8 shrink-0 flex justify-center pt-0.5">
                          <Check className="w-6 h-6 text-[#8A3CFF]" />
                        </span>
                      ) : (
                        <span className="font-persona text-3xl text-[#1F1F24] leading-none w-8 shrink-0" style={{ WebkitTextStroke: '1px #8A3CFF' }}>
                          {i + 1}
                        </span>
                      )}
                      <div>
                        <strong className={`block text-[#E8E8EF] tracking-widest ${done ? 'line-through decoration-[#8A3CFF]' : ''}`}>{title}</strong>
                        <span className="text-[#5B5B66] normal-case">{done ? DONE_TEXT[i] : text}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Reveal>

            <Reveal className="lg:col-span-6 w-full" delay={120}>
              {ticketData ? (
                <TicketBadge
                  queuePosition={ticketData.queue_position}
                  name={ticketData.name}
                  phone={ticketData.phone}
                  email={ticketData.email}
                  createdAt={ticketData.created_at}
                  alreadyRegistered={ticketData.already_registered}
                  paid={isPaid}
                  ticketCode={ticketData.ticket_code}
                  lotName={lot.name}
                  onReset={() => setTicketData(null)}
                />
              ) : (
                <div className="border-flow">
                  <div className="bg-[#141418] p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="glow-uv w-64 h-64 -right-24 -top-24 opacity-40" />

                    <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-[#1F1F24]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#8A3CFF] pulse-livestream" />
                        <span className="font-data text-[10px] text-[#E8E8EF] uppercase tracking-widest font-bold">
                          PRÉ-VENDA ABERTA
                        </span>
                      </div>
                      <span className="font-data text-[9px] text-[#8A3CFF] bg-[#8A3CFF]/10 px-2 py-0.5 border border-[#8A3CFF]/20 uppercase tracking-widest">
                        {lot.code}
                      </span>
                    </div>

                    <div className="relative space-y-5 my-2">
                      <div className="flex items-center gap-3">
                        <PersonaMaskIcon className="w-10 h-6" fillColor="#8A3CFF" />
                        <span className="font-persona text-3xl uppercase tracking-wider text-[#E8E8EF]">
                          ACESSO ANTECIPADO
                        </span>
                      </div>

                      <p className="font-data text-xs text-[#5B5B66] uppercase leading-relaxed tracking-wide">
                        Garanta prioridade na compra antes da abertura ao público geral. Vagas limitadas para o {lot.name.toLowerCase()}.
                      </p>

                      <div className="crosshair-corners bg-[#0B0B0D] p-4 font-data flex items-end justify-between gap-4">
                        <span className="text-[10px] text-[#5B5B66] uppercase tracking-widest leading-relaxed">
                          VALOR DE ENTRADA
                          <br />
                          NA FILA:
                        </span>
                        <span className="text-right">
                          <strong className="block font-persona text-4xl text-[#8A3CFF] leading-none">GRATUITO</strong>
                          <span className="text-[10px] text-[#5B5B66]">(R$ 0,00)</span>
                        </span>
                      </div>
                    </div>

                    <div className="relative mt-8 space-y-3">
                      <button
                        onClick={openJoin}
                        className="cta-neon w-full bg-[#FF2E3B] hover:bg-[#ff424e] active:scale-[0.99] text-[#E8E8EF] font-persona text-xl sm:text-2xl uppercase py-4 px-6 tracking-wider flex items-center justify-center gap-3 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8E8EF]"
                      >
                        <span>ENTRAR NA FILA DO {lot.name}</span>
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
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* ============ A NOITE: CARDS COM FOTO ============ */}
        <section className="relative max-w-6xl mx-auto px-4 pb-20 md:pb-28">
          <Reveal>
            <SectionLabel index="02">A NOITE</SectionLabel>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <h2 className="font-persona text-5xl sm:text-6xl uppercase leading-[0.9] tracking-tight">
                UMA NOITE POR ANO.
                <br />
                <span className="text-[#5B5B66]">SEM ROSTOS.</span>
              </h2>
              <p className="font-data text-[11px] text-[#5B5B66] uppercase tracking-wide max-w-xs leading-relaxed">
                Você não sabe quem está do seu lado, e é isso que faz a noite.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EXPERIENCE.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.index} delay={i * 120}>
                  <article className="group relative h-[420px] border border-[#1F1F24] hover:border-[#8A3CFF]/50 transition-colors duration-300 overflow-hidden">
                    <div className={`duotone duotone-bright absolute inset-0 ${item.tone === 'red' ? 'duotone-red' : ''}`}>
                      <Image
                        src={item.img}
                        alt={item.alt}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/50 to-transparent" />

                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-data text-[10px] uppercase tracking-widest">
                      <span className="text-[#E8E8EF]/70">{item.index} · {item.label}</span>
                      <span className="w-8 h-8 flex items-center justify-center bg-[#0B0B0D]/70 border border-[#1F1F24] group-hover:bg-[#8A3CFF] group-hover:border-[#8A3CFF] transition-colors">
                        <Icon className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="font-persona text-3xl uppercase leading-[0.95] tracking-wide mb-2">{item.title}</h3>
                      <p className="font-data text-[11px] text-[#E8E8EF]/60 uppercase tracking-wide leading-relaxed">{item.text}</p>
                      <span className="block mt-4 h-0.5 w-10 bg-[#8A3CFF] group-hover:w-full transition-all duration-500" />
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ============ FAIXA: A REGRA DA MÁSCARA ============ */}
        <section className="relative overflow-hidden border-y border-[#1F1F24]">
          <div className="absolute inset-0">
            <Image
              src={masksRow}
              alt="Fileira de máscaras venezianas sobre fundo preto"
              fill
              placeholder="blur"
              sizes="100vw"
              className="object-cover object-center opacity-50"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0D] via-[#0B0B0D]/40 to-[#0B0B0D]" />
          <div className="glow-red w-[500px] h-[300px] left-[calc(50%-250px)] top-1/3" />

          <Reveal className="relative max-w-6xl mx-auto px-4 py-28 md:py-40 text-center">
            <span className="font-data text-[10px] text-[#FF2E3B] uppercase tracking-[0.4em]">{'// '}A REGRA</span>
            <h2
              data-text="SEM MÁSCARA, SEM ENTRADA."
              className="glitch font-persona text-5xl sm:text-7xl md:text-8xl uppercase leading-[0.88] tracking-tight mt-4 mb-6"
            >
              SEM MÁSCARA, SEM ENTRADA.
            </h2>
            <p className="font-data text-xs text-[#E8E8EF]/70 uppercase tracking-wide max-w-lg mx-auto leading-relaxed">
              Qualquer máscara vale: veneziana, moderna, avant-garde. Compre, faça ou improvise. Só não chega de cara limpa.
            </p>
            <span className="inline-block mt-6 font-data text-[10px] uppercase tracking-widest border border-[#E8E8EF]/20 bg-[#0B0B0D]/60 px-3 py-1.5">
              Paleta sugerida: All Black & Dark Minimalist
            </span>
          </Reveal>
        </section>

        {/* ============ GALERIA ============ */}
        <section className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <Reveal>
            <SectionLabel index="03">ATMOSFERA</SectionLabel>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-3 md:h-[520px]">
            <Reveal className="col-span-2 md:row-span-2 h-64 md:h-full">
              <div className="duotone duotone-red relative h-full border border-[#1F1F24]">
                <Image src={maskRed} alt="Rosto com máscara de renda vermelha" fill placeholder="blur" sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            </Reveal>
            <Reveal className="col-span-2 h-48 md:h-full" delay={100}>
              <div className="duotone relative h-full border border-[#1F1F24]">
                <Image src={crowdStage} alt="Público com as mãos para cima sob luzes roxas" fill placeholder="blur" sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            </Reveal>
            <Reveal className="h-40 md:h-full" delay={200}>
              <div className="duotone relative h-full border border-[#1F1F24]">
                <Image src={maskDrink} alt="Máscara veneziana roxa com penas sobre uma taça de drink" fill placeholder="blur" sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
              </div>
            </Reveal>
            <Reveal className="h-40 md:h-full" delay={300}>
              <div className="relative h-full bg-[#141418] border border-[#1F1F24] p-4 flex flex-col justify-between">
                <PersonaMaskIcon className="w-10 h-6" fillColor="#8A3CFF" />
                <p className="font-persona text-2xl md:text-3xl uppercase leading-[0.95]">
                  QUEM ESTÁ DO <span className="text-[#FF2E3B]">SEU LADO?</span>
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============ GUIA DO BAILE (ACCORDION) ============ */}
        <section className="max-w-3xl mx-auto px-4 pb-20 md:pb-28 w-full font-data text-xs">
          <Reveal>
            <div className="flex items-center justify-between mb-3 text-[10px] uppercase text-[#5B5B66]">
              <span>{'// '}GUIA DO BAILE</span>
              <span>TOQUE PARA VER DETALHES</span>
            </div>

            <div className="space-y-2">
              {guide.map((item) => {
                const open = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    data-open={open}
                    className="accordion-item relative bg-[#141418] border border-[#1F1F24] hover:border-[#2A2A32] transition-colors"
                  >
                    <span className="accordion-line absolute top-0 left-0 right-0 h-px" style={{ background: item.accent }} />
                    <button
                      onClick={() => toggleTab(item.id)}
                      aria-expanded={open}
                      aria-controls={`guia-${item.id}`}
                      className="w-full p-4 flex items-center justify-between text-left text-xs uppercase font-bold text-[#E8E8EF] transition-colors"
                      style={open ? { color: item.accent } : undefined}
                    >
                      <span>{item.title}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                        style={{ color: open ? item.accent : '#5B5B66' }}
                      />
                    </button>
                    <div id={`guia-${item.id}`} data-open={open} className="accordion-panel">
                      <div>
                        <div className="px-4 pb-4 pt-1 text-[#5B5B66] border-t border-[#1F1F24] space-y-1.5 text-[11px] leading-relaxed">
                          {item.content}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* ============ CTA FINAL ============ */}
        {!ticketData && (
          <section className="relative overflow-hidden border-t border-[#1F1F24]">
            <div className="glow-uv w-[520px] h-[320px] left-[calc(50%-260px)] -bottom-40" />
            <Reveal className="relative max-w-6xl mx-auto px-4 py-20 md:py-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <span className="font-data text-[10px] text-[#8A3CFF] uppercase tracking-widest">{'// '}{lot.code} · VAGAS LIMITADAS</span>
                <h2 className="font-persona text-5xl sm:text-6xl uppercase leading-[0.9] tracking-tight mt-2">
                  A MÁSCARA É SUA.
                  <br />
                  <span className="text-[#FF2E3B]">O LUGAR NA FILA TAMBÉM.</span>
                </h2>
              </div>
              <button
                onClick={openJoin}
                className="cta-neon shrink-0 bg-[#FF2E3B] hover:bg-[#ff424e] active:scale-[0.99] text-[#E8E8EF] font-persona text-xl sm:text-2xl uppercase py-4 px-8 tracking-wider flex items-center gap-3 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8E8EF]"
              >
                <span>ENTRAR NA FILA</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Reveal>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="no-print border-t border-[#1F1F24] py-4 px-4 font-data text-[10px] text-[#5B5B66] uppercase">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <PersonaMaskIcon className="w-4 h-2.5" fillColor="#8A3CFF" />
            <span>BAILE DA LAGOA · 31.10 · SJC</span>
          </div>

          <div className="flex items-center gap-3">
            <span>SEM MÁSCARA, SEM ENTRADA</span>
            <span>·</span>
            <button
              onClick={() => setIsShareQrOpen(true)}
              className="text-[#5B5B66] hover:text-[#8A3CFF] flex items-center gap-1 transition-colors"
            >
              <QrCode className="w-3 h-3" />
              <span>Compartilhar</span>
            </button>
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

      <JoinQueueModal
        isOpen={isJoinModalOpen}
        lotName={lot.name}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={(data) => setTicketData(data)}
      />

      <CheckStatusModal
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        onFound={(data) => setTicketData(data)}
      />

      <ShareSiteQrModal isOpen={isShareQrOpen} onClose={() => setIsShareQrOpen(false)} />
    </div>
  );
}
