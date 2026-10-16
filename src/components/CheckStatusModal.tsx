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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 text-white border-2 border-white w-full max-w-md p-6 relative shadow-[8px_8px_0px_0px_#FF5722]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <span className="text-[10px] font-mono uppercase text-[#FF5722] tracking-widest block mb-1">
          // LOCALIZAR REGISTRO
        </span>
        <h3 className="ascend-font text-2xl uppercase tracking-tight mb-2">
          CONSULTAR <span className="text-yellow-ascend">POSIÇÃO NA FILA</span>
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Informe o WhatsApp ou e-mail cadastrado para verificar sua posição e comprovante.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              WhatsApp ou E-mail cadastrado
            </label>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="(11) 99999-9999 ou seu@email.com"
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5722] hover:bg-orange-500 text-black font-black py-3 px-4 uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-2 border-black transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Buscar Posição</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
