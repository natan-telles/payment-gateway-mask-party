'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { MIN_AGE, MAX_AGE } from '@/lib/event';
import { QueueResponse } from '@/types/database';

interface QueueFormProps {
  onSuccess: (data: NonNullable<QueueResponse['data']>) => void;
}

export function QueueForm({ onSuccess }: QueueFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [instagram, setInstagram] = useState('');
  const [source, setSource] = useState('direct');

  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utm = params.get('utm_source') || params.get('source') || params.get('src');
      if (utm) setSource(utm);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Informe um WhatsApp válido com DDD.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim(),
          age: age ? parseInt(age, 10) : null,
          neighborhood: neighborhood.trim() || null,
          instagram: instagram.trim() || null,
          source,
        }),
      });

      const json: any = await res.json();
      const payload = json.data || (json.id ? json : null);

      if (!res.ok || !json.success || !payload) {
        throw new Error(json.error || 'Erro ao garantir lugar na lista.');
      }

      onSuccess(payload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#141418] border border-[#1F1F24] hover:border-[#2A2A32] p-5 sm:p-6 shadow-2xl relative transition-all duration-300 animate-stack-2">
      {/* Header do Card */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1F1F24]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#8A3CFF] rounded-full" />
          <span className="font-data text-[10px] uppercase text-[#8A3CFF] tracking-widest font-bold">
            PRÉ-VENDA EXCLUSIVA
          </span>
        </div>
        <span className="font-data text-[10px] uppercase bg-[#0B0B0D] text-[#E8E8EF] px-2 py-0.5 border border-[#1F1F24]">
          1º LOTE
        </span>
      </div>

      {errorMessage && (
        <div className="mb-4 p-2.5 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs font-data">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 font-data text-xs">
        {/* Nome */}
        <div>
          <label className="block text-[10px] uppercase text-[#5B5B66] mb-1 font-bold">
            Nome Completo
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="COMO QUER SER CHAMADO"
            className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2.5 font-data text-xs uppercase outline-none transition-all placeholder:text-[#5B5B66]"
          />
        </div>

        {/* WhatsApp & Email em grid compacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase text-[#5B5B66] mb-1 font-bold">
              WhatsApp
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(12) 99999-9999"
              className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2.5 font-data text-xs outline-none transition-all placeholder:text-[#5B5B66]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#5B5B66] mb-1 font-bold">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2.5 font-data text-xs outline-none transition-all placeholder:text-[#5B5B66]"
            />
          </div>
        </div>

        {/* Accordion compacto para opcionais */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-[10px] text-[#5B5B66] hover:text-[#8A3CFF] flex items-center gap-1 py-1 transition-colors uppercase font-data"
          >
            <span>{showOptional ? '- Menos detalhes' : '+ Adicionar bairro / Instagram'}</span>
            {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showOptional && (
            <div className="grid grid-cols-3 gap-2 pt-2 animate-in fade-in duration-200">
              <div>
                <label className="block text-[9px] uppercase text-[#5B5B66] mb-1">Idade</label>
                <input
                  type="number"
                  min={MIN_AGE}
                  max={MAX_AGE}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="20"
                  className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-2 py-2 font-data text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-[#5B5B66] mb-1">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Aquarius"
                  className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-2 py-2 font-data text-xs outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-[#5B5B66] mb-1">Instagram</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@user"
                  className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-2 py-2 font-data text-xs outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* CTA VERMELHO SINAL */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF2E3B] hover:bg-[#ff4753] active:scale-[0.99] disabled:opacity-50 text-white font-persona text-xl py-3.5 px-4 tracking-normal transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-[#FF2E3B]/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>RESERVANDO...</span>
              </>
            ) : (
              <>
                <span>GARANTIR MEU LUGAR NO 1º LOTE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="font-data text-[9px] text-[#5B5B66] text-center uppercase tracking-widest mt-2">
            Sem custo. Quem chega antes garante o 1º lote.
          </p>
        </div>
      </form>
    </div>
  );
}
