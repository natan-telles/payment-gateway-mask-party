'use client';

import React, { useState } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Como funciona a fila de espera?',
    a: 'A ordem da fila é definida estritamente pelo carimbo de data e hora do seu registro. Os primeiros cadastrados serão os primeiros chamados para comprar o ingresso quando os lotes abrirem.',
  },
  {
    q: 'Como receberei o acesso para pagamento?',
    a: 'Você receberá uma mensagem no WhatsApp cadastrado (com fallback por e-mail) contendo o link direto e o QR Code PIX exclusivo para efetuar o pagamento dentro do prazo de validade.',
  },
  {
    q: 'O que acontece se eu não pagar a tempo?',
    a: 'Cada chamada de pagamento possui um tempo limite de expiração (definido pela organização). Se o pagamento não for confirmado dentro desse período, a vaga retorna ao inventário e o próximo da fila é imediatamente notificado.',
  },
  {
    q: 'Entrar na fila é gratuito?',
    a: 'Sim! A inscrição na fila de espera é 100% gratuita e não requer cartão ou pagamento prévio.',
  },
  {
    q: 'Estar na fila garante o meu ingresso?',
    a: 'Não garante o ingresso final, mas garante a sua prioridade cronológica na abertura de vendas dos lotes.',
  },
  {
    q: 'Qual o formato do pagamento e entrega?',
    a: 'O pagamento é via PIX instantâneo com confirmação em tempo real. Assim que aprovado, o sistema emite automaticamente o seu ingresso digital com QR Code de entrada, instruções de acesso e orientações de dress code.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-[#FF5722]" />
        <span className="text-[10px] uppercase font-mono tracking-widest text-[#FF5722]">
          // DÚVIDAS FREQUENTES
        </span>
      </div>
      <h2 className="ascend-font text-3xl md:text-5xl uppercase tracking-tight text-white mb-8">
        PERGUNTAS <span className="text-yellow-ascend">FREQUENTES</span>
      </h2>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`border-2 transition-all ${
                isOpen ? 'border-[#FF5722] bg-zinc-950 shadow-[4px_4px_0px_0px_#FF5722]' : 'border-zinc-800 bg-black hover:border-zinc-700'
              }`}
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-4 md:p-5 flex items-center justify-between text-left gap-4"
              >
                <span className="font-bold uppercase text-sm md:text-base tracking-wide text-white">
                  {item.q}
                </span>
                <span className={`p-1 border border-zinc-700 flex-shrink-0 ${isOpen ? 'bg-[#FF5722] text-black' : 'text-zinc-400'}`}>
                  {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-zinc-300 text-xs md:text-sm leading-relaxed border-t border-zinc-900 font-sans">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
