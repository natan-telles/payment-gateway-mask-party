'use client';

import React, { useEffect, useState } from 'react';

// Abertura do baile: sábado 31/10/2026, 20h (horário de Brasília)
const EVENT_START = new Date('2026-10-31T20:00:00-03:00').getTime();

function getRemaining() {
  const diff = Math.max(0, EVENT_START - Date.now());
  return {
    dias: Math.floor(diff / 86_400_000),
    horas: Math.floor((diff / 3_600_000) % 24),
    min: Math.floor((diff / 60_000) % 60),
    seg: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown({ className = '' }: { className?: string }) {
  // Só calcula no cliente para não divergir do HTML do servidor
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(getRemaining());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const units: Array<[string, number | undefined]> = [
    ['DIAS', remaining?.dias],
    ['HORAS', remaining?.horas],
    ['MIN', remaining?.min],
    ['SEG', remaining?.seg],
  ];

  return (
    <div className={`flex items-stretch gap-1.5 font-data ${className}`} aria-label="Contagem regressiva para o baile">
      {units.map(([label, value], i) => (
        <React.Fragment key={label}>
          <div className="bg-[#0B0B0D]/70 border border-[#1F1F24] px-2.5 sm:px-3 py-2 text-center min-w-[56px] backdrop-blur-sm">
            <span className="block font-persona text-2xl sm:text-3xl text-[#E8E8EF] tabular-nums leading-none">
              {value === undefined ? '--' : String(value).padStart(2, '0')}
            </span>
            <span className="block text-[8px] text-[#5B5B66] uppercase tracking-widest mt-1">{label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="self-center text-[#8A3CFF] font-persona text-xl" aria-hidden>
              :
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
