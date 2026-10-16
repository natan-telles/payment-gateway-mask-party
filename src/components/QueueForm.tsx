'use client';

import { QueueResponse } from '@/types/database';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Captura parâmetros de UTM ou origem da URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utm = params.get('utm_source') || params.get('source') || params.get('src');
      if (utm) setSource(utm);
    }
  }, []);

  // Máscara brasileira de telefone (XX) XXXXX-XXXX
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
      setErrorMessage('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: cleanPhone,
          email,
          age: age ? parseInt(age, 10) : null,
          neighborhood,
          instagram,
          source,
        }),
      });

      const json: any = await res.json();
      const payload = json.data || (json.id ? json : null);

      if (!res.ok || !json.success || !payload) {
        throw new Error(json.error || 'Erro ao registrar na fila de espera.');
      }

      onSuccess(payload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-black text-white border-2 border-white/20 p-6 md:p-8 shadow-[8px_8px_0px_0px_#FF5722] relative">
      {/* Badge Topo */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#FF5722] block">
            // REGISTRO DE PRIORIDADE
          </span>
          <h2 className="ascend-font text-3xl uppercase tracking-tight text-white">
            ENTRAR NA <span className="text-yellow-ascend">FILA DE ESPERA</span>
          </h2>
        </div>
        <div className="bg-[#FF5722] text-black font-black text-xs px-2.5 py-1 uppercase font-mono">
          GRÁTIS
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
            Nome Completo <span className="text-[#FF5722]">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="EX: NATAN SILVA"
            className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm uppercase outline-none transition-colors"
          />
        </div>

        {/* WhatsApp e E-mail em grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              WhatsApp / Celular <span className="text-[#FF5722]">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm outline-none transition-colors"
            />
            <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
              Canal de notificação do PIX
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              E-mail <span className="text-[#FF5722]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm lowercase outline-none transition-colors"
            />
            <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
              Backup e envio de ingressos
            </span>
          </div>
        </div>

        {/* Bairro, Idade e Instagram (Opcionais do Debrief) */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Idade
            </label>
            <input
              type="number"
              min="12"
              max="99"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="24"
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Bairro / Cidade
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Pinheiros"
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm uppercase outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@seuuser"
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {/* Termo e Submissão */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5722] hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 px-6 uppercase text-sm tracking-wider flex items-center justify-center gap-3 border-2 border-white/40 shadow-[4px_4px_0px_0px_#fff] transition-all active:translate-y-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-black" />
                <span>Registrando Posição...</span>
              </>
            ) : (
              <>
                <span>GARANTIR PRIORIDADE NA FILA</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-[10px] text-zinc-500 text-center font-mono uppercase tracking-wider mt-3">
            Posição calculada por ordem de timestamp. Cadastro 100% imutável.
          </p>
        </div>
      </form>
    </div>
  );
}
