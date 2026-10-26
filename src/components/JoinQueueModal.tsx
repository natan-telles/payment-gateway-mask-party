'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { PersonaMaskIcon } from './PersonaMaskIcon';
import { DEFAULT_LOT } from '@/lib/lots/labels';
import { QueueResponse } from '@/types/database';

interface JoinQueueModalProps {
  isOpen: boolean;
  lotName?: string;
  onClose: () => void;
  onSuccess: (data: NonNullable<QueueResponse['data']>) => void;
}

export function JoinQueueModal({ isOpen, lotName = DEFAULT_LOT.name, onClose, onSuccess }: JoinQueueModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [instagram, setInstagram] = useState('');
  const [source, setSource] = useState('direct');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utm = params.get('utm_source') || params.get('source') || params.get('src');
      if (utm) setSource(utm);
    }
  }, []);

  if (!isOpen) return null;

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
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B0B0D]/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#141418] text-[#E8E8EF] border border-[#1F1F24] hover:border-[#2A2A32] w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 font-data">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B5B66] hover:text-[#E8E8EF] p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header do Modal */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 bg-[#8A3CFF] flex items-center justify-center p-1">
            <PersonaMaskIcon className="w-full h-full" fillColor="#0B0B0D" />
          </div>
          <span className="font-data text-[9px] uppercase text-[#8A3CFF] tracking-widest font-bold">
            PRÉ-VENDA BAILE DA LAGOA
          </span>
        </div>

        <h3 className="font-persona text-3xl uppercase tracking-tight text-[#E8E8EF] mb-1">
          ENTRAR NA LISTA
        </h3>
        <p className="text-xs text-[#5B5B66] mb-5">
          Garanta seu lugar no {lotName}. Notificação direta no WhatsApp.
        </p>

        {errorMessage && (
          <div className="mb-4 p-2.5 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
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
              placeholder="SEU NOME COMPLETO"
              className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2.5 text-xs uppercase outline-none transition-all placeholder:text-[#5B5B66]"
              autoFocus
            />
          </div>

          {/* WhatsApp & Email */}
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
                className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2.5 text-xs outline-none transition-all placeholder:text-[#5B5B66]"
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
                className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2.5 text-xs outline-none transition-all placeholder:text-[#5B5B66]"
              />
            </div>
          </div>

          {/* Campos Complementares Opcionais (Diretamente visíveis sem botão) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
            <div>
              <label className="block text-[10px] uppercase text-[#5B5B66] mb-1 font-bold">
                Idade
              </label>
              <input
                type="number"
                min="16"
                max="99"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ex: 21"
                className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2 text-xs outline-none transition-all placeholder:text-[#5B5B66]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#5B5B66] mb-1 font-bold">
                Bairro
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Aquarius"
                className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2 text-xs outline-none uppercase transition-all placeholder:text-[#5B5B66]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#5B5B66] mb-1 font-bold">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@user"
                className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] px-3 py-2 text-xs outline-none transition-all placeholder:text-[#5B5B66]"
              />
            </div>
          </div>

          {/* Botão de Submissão Vermelho Sinal */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF2E3B] hover:bg-[#ff4753] active:scale-[0.99] disabled:opacity-50 text-white font-persona text-xl py-3.5 px-4 tracking-normal transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-[#FF2E3B]/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>RESERVANDO MEU LUGAR...</span>
                </>
              ) : (
                <>
                  <span>CONFIRMAR MEU LUGAR NO {lotName}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[9px] text-[#5B5B66] text-center uppercase tracking-widest mt-2">
              Inscrição gratuita. Sem máscara, sem entrada.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
