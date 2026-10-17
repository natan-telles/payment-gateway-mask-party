'use client';

import React, { useState } from 'react';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import { QueueResponse } from '@/types/database';

interface CheckStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFound: (data: NonNullable<QueueResponse['data']>) => void;
}

export function CheckStatusModal({ isOpen, onClose, onFound }: CheckStatusModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Mesmo campo para WhatsApp e e-mail: só números vira máscara de telefone,
  // qualquer letra ou @ volta para texto livre (e-mail)
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (/[a-zA-Z@]/.test(value)) {
      const wasPhone = !/[a-zA-Z@]/.test(query) && /\d/.test(query);
      setQuery(wasPhone ? value.replace(/[()\s-]/g, '') : value);
      return;
    }

    let digits = value.replace(/\D/g, '');
    if (digits.length > 11) digits = digits.slice(0, 11);

    if (digits.length > 6) {
      setQuery(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
    } else if (digits.length > 2) {
      setQuery(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else if (digits.length > 0) {
      setQuery(`(${digits}`);
    } else {
      setQuery('');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/queue?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      const payload = json.data || (json.id ? json : null);

      if (!res.ok || !json.success || !payload) {
        throw new Error(json.error || 'Nenhum registro encontrado para este WhatsApp ou e-mail.');
      }

      onFound({
        ...payload,
        already_registered: true,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B0B0D]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#141418] text-[#E8E8EF] border border-[#1F1F24] w-full max-w-sm p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B5B66] hover:text-[#E8E8EF] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="font-data text-[9px] uppercase text-[#8A3CFF] tracking-widest block mb-1">
          // PRÉ-VENDA BAILE DA LAGOA
        </span>
        <h3 className="font-persona text-2xl uppercase tracking-tight mb-2">
          CONSULTAR MEU LUGAR
        </h3>
        <p className="text-xs text-[#5B5B66] font-data mb-6">
          Informe o WhatsApp ou e-mail que você cadastrou.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs font-data">
            {error}
          </div>
        )}

        <form onSubmit={handleSearch} className="space-y-4 font-data text-xs">
          <div>
            <label className="block text-[10px] uppercase text-[#5B5B66] mb-1">
              WhatsApp ou E-mail
            </label>
            <input
              type="text"
              required
              value={query}
              onChange={handleQueryChange}
              placeholder="(12) 99999-9999 ou seu@email.com"
              className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] p-2.5 font-data text-xs outline-none transition-colors"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-persona text-lg py-3 px-4 uppercase tracking-normal flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>BUSCANDO...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>CONSULTAR BILHETE</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
