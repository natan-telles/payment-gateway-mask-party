'use client';

import React from 'react';
import { Eye, MapPin, Music, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

export function EventBranding() {
  return (
    <section className="w-full max-w-6xl mx-auto py-16 px-4 border-t border-zinc-800">
      {/* Header da Seção */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#FF5722] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            // THE CONCEPT & EXPERIENCE
          </span>
          <h2 className="ascend-font text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-white mt-1">
            A EXPERIÊNCIA <span className="text-[#FF5722]">MASK PARTY</span>
          </h2>
        </div>
        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest max-w-md">
          Uma noite imersiva onde a identidade se dissolve e a música comanda. Lotação estritamente limitada.
        </p>
      </div>

      {/* Grid de Destaques da Marca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: Dress Code */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8 hover:border-[#FF5722] transition-colors relative group">
          <div className="w-12 h-12 bg-black border border-zinc-700 flex items-center justify-center mb-6 text-[#FF5722] group-hover:bg-[#FF5722] group-hover:text-black transition-colors">
            <Eye className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
            DIRETRIZ OBRIGATÓRIA
          </span>
          <h3 className="ascend-font text-2xl uppercase tracking-wide text-white mb-3">
            DRESS CODE & MÁSCARA
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
            O uso de máscara é compulsório para acesso à festa (estilo veneziana, moderna, avant-garde ou cyberpunk). Paleta recomendada: <strong>All Black & Dark Minimalist</strong>.
          </p>
          <div className="inline-block bg-yellow-ascend text-black font-black text-[10px] px-2 py-0.5 uppercase font-mono">
            SEM MÁSCARA, SEM ACESSO
          </div>
        </div>

        {/* Card 2: Local Secreto */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8 hover:border-yellow-ascend transition-colors relative group">
          <div className="w-12 h-12 bg-black border border-zinc-700 flex items-center justify-center mb-6 text-yellow-ascend group-hover:bg-yellow-ascend group-hover:text-black transition-colors">
            <MapPin className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
            SECRET VENUE
          </span>
          <h3 className="ascend-font text-2xl uppercase tracking-wide text-white mb-3">
            LOCALIZAÇÃO SECRETA
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
            Espaço industrial exclusivo na capital com cenografia visual imersiva e acoustics de alta fidelidade. O endereço exato é revelado via WhatsApp exclusivamente para quem concluir o pagamento do ingresso.
          </p>
          <div className="inline-block bg-zinc-800 text-zinc-300 font-bold text-[10px] px-2 py-0.5 uppercase font-mono">
            REVELADO APÓS PAGAMENTO
          </div>
        </div>

        {/* Card 3: Sonoridade & Vibe */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8 hover:border-[#FF5722] transition-colors relative group">
          <div className="w-12 h-12 bg-black border border-zinc-700 flex items-center justify-center mb-6 text-[#FF5722] group-hover:bg-[#FF5722] group-hover:text-black transition-colors">
            <Music className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
            CURADORIA SONORA
          </span>
          <h3 className="ascend-font text-2xl uppercase tracking-wide text-white mb-3">
            SOUND & ATMOSPHERE
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
            Curadoria musical focada em House, Melodic Techno, Dark Disco e batidas progressivas com Sound System de alta definição para uma experiência sonora imersiva até o amanhecer.
          </p>
          <div className="inline-block bg-black text-[#FF5722] border border-[#FF5722] font-black text-[10px] px-2 py-0.5 uppercase font-mono">
            LINEUP EM BREVE
          </div>
        </div>
      </div>

      {/* Faixa de Aviso de Lotes e Capacidade */}
      <div className="bg-black border-2 border-white/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[6px_6px_0px_0px_#FF5722]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#FF5722] text-black font-black flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="ascend-font text-2xl uppercase tracking-wide text-white">
              CAPACIDADE LIMITADA // FILA OBRIGATÓRIA
            </h4>
            <p className="text-xs text-zinc-400 font-sans mt-1 max-w-xl">
              Devido à capacidade do espaço, a venda de ingressos não será pública em bilheterias convencionais. Os ingressos serão vendidos <strong>estritamente pela ordem de cadastro</strong> da lista de espera.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 font-mono">
          <div className="text-right">
            <span className="text-[9px] uppercase text-zinc-500 block">ABERTURA DO 1º LOTE</span>
            <span className="ascend-font text-2xl text-yellow-ascend">17/10/2026</span>
          </div>
        </div>
      </div>
    </section>
  );
}
