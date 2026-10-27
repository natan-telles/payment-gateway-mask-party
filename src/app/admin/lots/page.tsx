'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Plus, Pencil, Trash2, Power, Ticket, X, Timer, Wallet } from 'lucide-react';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';
import { AdminNavTabs } from '@/components/AdminNavTabs';
import { formatPrice } from '@/lib/payments/format';

interface AdminLot {
  id: string;
  name: string;
  sort_order: number;
  price_cents: number;
  capacity: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sold: number;
  reserved: number;
  revenue_cents?: number;
  available: number;
  is_current: boolean;
}

interface ActiveReservation {
  lot_id: string;
  name: string;
  phone: string;
  amount_cents: number;
  reserved_until: string;
  minutes_left: number;
}

interface LotForm {
  id: string | null;
  name: string;
  sortOrder: string;
  price: string;
  capacity: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_FORM: LotForm = {
  id: null,
  name: '',
  sortOrder: '',
  price: '',
  capacity: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

// "50,00" | "50.00" | "50" -> 5000
function parsePriceToCents(value: string) {
  const normalized = value.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

// ISO -> valor do <input type="datetime-local"> no fuso do navegador
function isoToLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDateTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '--';
}

const ADMIN_PW_KEY = 'mask_party_admin_pw';
const subscribeToNothing = () => () => {};

// Senha salva no login do painel principal (null durante a renderização no servidor)
function useAdminPassword() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => sessionStorage.getItem(ADMIN_PW_KEY) ?? '',
    () => null
  );
}

function getLotStatus(lot: AdminLot) {
  const now = Date.now();
  if (!lot.is_active) return { label: 'INATIVO', className: 'bg-[#1F1F24] text-[#5B5B66]' };
  if (lot.ends_at && Date.parse(lot.ends_at) <= now) return { label: 'ENCERRADO', className: 'bg-[#1F1F24] text-[#5B5B66]' };
  if (lot.starts_at && Date.parse(lot.starts_at) > now) return { label: 'AGENDADO', className: 'bg-sky-950 text-sky-400' };
  if (lot.available === 0) return { label: 'ESGOTADO', className: 'bg-red-950 text-[#FF2E3B]' };
  if (lot.is_current) return { label: 'VIGENTE', className: 'bg-[#8A3CFF] text-[#0B0B0D]' };
  return { label: 'NA SEQUÊNCIA', className: 'bg-[#0B0B0D] text-[#E8E8EF] border border-[#1F1F24]' };
}

export default function LotsPage() {
  const [lots, setLots] = useState<AdminLot[]>([]);
  const [reservations, setReservations] = useState<ActiveReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LotForm | null>(null);
  const password = useAdminPassword();

  const request = useCallback(
    async (method: string, body?: unknown, query = '') => {
      const res = await fetch(`/api/admin/lots${query}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password ?? '' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Erro na operação.');
      return json;
    },
    [password]
  );

  const fetchLots = async () => {
    setLoading(true);
    try {
      const json = await request('GET');
      setLots(json.data);
      setReservations(Array.isArray(json.activeReservations) ? json.activeReservations : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão ao carregar lotes.');
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial assim que a senha do painel estiver disponível
  useEffect(() => {
    if (!password) return;
    let cancelled = false;

    request('GET')
      .then((json) => {
        if (cancelled) return;
        setLots(json.data);
        setReservations(Array.isArray(json.activeReservations) ? json.activeReservations : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro de conexão ao carregar lotes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [password, request]);

  const openCreate = () => {
    const nextOrder = lots.length ? Math.max(...lots.map((l) => l.sort_order)) + 1 : 1;
    setForm({ ...EMPTY_FORM, sortOrder: String(nextOrder) });
    setError(null);
  };

  const openEdit = (lot: AdminLot) => {
    setForm({
      id: lot.id,
      name: lot.name,
      sortOrder: String(lot.sort_order),
      price: centsToInput(lot.price_cents),
      capacity: String(lot.capacity),
      startsAt: isoToLocalInput(lot.starts_at),
      endsAt: isoToLocalInput(lot.ends_at),
      isActive: lot.is_active,
    });
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const payload = {
      name: form.name,
      sort_order: Number(form.sortOrder),
      price_cents: parsePriceToCents(form.price),
      capacity: Number(form.capacity),
      starts_at: localInputToIso(form.startsAt),
      ends_at: localInputToIso(form.endsAt),
      is_active: form.isActive,
    };

    setSaving(true);
    setError(null);

    try {
      if (form.id) await request('PATCH', { id: form.id, ...payload });
      else await request('POST', payload);
      setForm(null);
      await fetchLots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar lote.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (lot: AdminLot) => {
    if (lot.is_active && !confirm(`Desativar o ${lot.name}? Ninguém mais consegue comprar nele.`)) return;
    setError(null);
    try {
      await request('PATCH', { id: lot.id, is_active: !lot.is_active });
      await fetchLots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lote.');
    }
  };

  const handleDelete = async (lot: AdminLot) => {
    if (!confirm(`Excluir o ${lot.name}? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    try {
      await request('DELETE', undefined, `?id=${encodeURIComponent(lot.id)}`);
      await fetchLots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir lote.');
    }
  };

  if (password === null) {
    return <div className="min-h-screen bg-[#0B0B0D]" />;
  }

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex flex-col items-center justify-center p-4">
        <div className="bg-[#141418] border border-[#1F1F24] p-8 max-w-sm w-full text-center shadow-2xl">
          <span className="font-data text-[10px] uppercase text-[#8A3CFF] tracking-widest block mb-2">
            {'// AUTENTICAÇÃO NECESSÁRIA'}
          </span>
          <h2 className="font-persona text-3xl uppercase tracking-tight text-[#E8E8EF] mb-4">ACESSO RESTRITO</h2>
          <p className="text-xs text-[#5B5B66] font-data mb-6">Faça login primeiro no painel principal.</p>
          <Link
            href="/admin"
            className="w-full inline-block bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-persona text-lg py-3 px-4 uppercase tracking-normal transition-colors"
          >
            Ir para o Login Admin &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] p-2.5 font-data text-xs outline-none transition-colors';
  const labelClass = 'block text-[10px] uppercase text-[#5B5B66] mb-1';

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] p-4 pb-28 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto border-b border-[#1F1F24] pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-1.5 bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF] text-[#5B5B66] hover:text-[#E8E8EF] transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <PersonaMaskIcon className="w-5 h-3.5" fillColor="#8A3CFF" />
              <div>
                <span className="font-persona text-3xl uppercase tracking-tight text-[#E8E8EF]">
                  BAILE DA LAGOA <span className="text-[#8A3CFF]">{'// LOTES'}</span>
                </span>
                <span className="font-data text-[10px] text-[#5B5B66] uppercase tracking-widest block mt-0.5">
                  PREÇOS, QUANTIDADES E VIRADA DE LOTE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLots()}
              disabled={loading}
              className="flex items-center gap-2 bg-[#141418] hover:bg-[#1f1f24] border border-[#1F1F24] px-3.5 py-2 text-xs font-data uppercase text-[#E8E8EF] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#8A3CFF] ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] px-3.5 py-2 text-xs font-data font-bold uppercase transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Lote</span>
            </button>
          </div>
        </div>

        <AdminNavTabs activeTab="lots" />
      </header>

      <div className="max-w-7xl mx-auto space-y-6">
        <p className="font-data text-[11px] text-[#5B5B66] leading-relaxed border-l-2 border-[#8A3CFF] pl-3">
          O lote vigente é o primeiro ativo (pela ordem) que já começou, ainda não terminou e tem vaga. Um lote fecha
          quando esgota ou quando chega o fim, o que vier primeiro, e o próximo abre automaticamente. Reservas não
          pagas liberam a vaga em 30 minutos. Mudanças de preço valem só para novas reservas.
        </p>

        {error && (
          <div className="p-4 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs font-data">{error}</div>
        )}

        {form && (
          <form onSubmit={handleSave} className="bg-[#141418] border border-[#8A3CFF]/60 p-6 font-data text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-persona text-2xl uppercase tracking-tight">
                {form.id ? 'EDITAR LOTE' : 'NOVO LOTE'}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="text-[#5B5B66] hover:text-[#E8E8EF] transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nome</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Uso interno (no site aparece Nº LOTE pela ordem)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ordem</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Preço (R$)</label>
                <input
                  required
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="50,00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Quantidade de ingressos</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="200"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Início (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fim (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-[#8A3CFF]"
                />
                <span className="uppercase text-[10px] text-[#E8E8EF]">Lote ativo</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2.5 border border-[#1F1F24] hover:border-[#5B5B66] uppercase text-[#5B5B66] hover:text-[#E8E8EF] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-bold uppercase transition-colors disabled:opacity-60"
              >
                {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Criar lote'}
              </button>
            </div>
          </form>
        )}

        {/* RESERVAS ATIVAS: quem está na tela do Pix neste minuto */}
        <section className="bg-[#141418] border border-amber-400/30 p-4 mb-6 font-data">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest text-amber-300 flex items-center gap-2">
              <Timer className="w-4 h-4" /> Reservas ativas agora ({reservations.length})
            </h2>
            <span className="text-[9px] text-[#5B5B66] uppercase">Cada reserva segura a vaga por 30 min</span>
          </div>
          {reservations.length === 0 ? (
            <p className="text-[11px] text-[#5B5B66]">Ninguém com Pix em aberto neste momento.</p>
          ) : (
            <ul className="divide-y divide-[#1F1F24]">
              {reservations.map((r) => {
                const lot = lots.find((l) => l.id === r.lot_id);
                return (
                  <li key={`${r.lot_id}-${r.phone}-${r.reserved_until}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="block uppercase text-[#E8E8EF] truncate">{r.name}</span>
                      <span className="text-[10px] text-[#5B5B66]">{lot ? lot.name : 'Lote'} · {formatPrice(r.amount_cents)}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-persona text-xl ${r.minutes_left <= 5 ? 'text-[#FF2E3B]' : 'text-amber-300'}`}>{r.minutes_left} min</span>
                      <span className="block text-[9px] text-[#5B5B66]">até {formatDateTime(r.reserved_until)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {loading && !lots.length ? (
          <div className="py-20 text-center text-[#5B5B66] font-data uppercase text-xs">Carregando lotes...</div>
        ) : !lots.length ? (
          <div className="py-20 text-center text-[#5B5B66] font-data uppercase text-xs">
            Nenhum lote cadastrado. Crie o primeiro lote para liberar as vendas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 font-data text-xs">
            {lots.map((lot) => {
              const status = getLotStatus(lot);
              const occupied = lot.sold + lot.reserved;
              const soldPct = lot.capacity ? Math.round((lot.sold / lot.capacity) * 100) : 0;
              const reservedPct = lot.capacity ? Math.round((lot.reserved / lot.capacity) * 100) : 0;

              return (
                <div
                  key={lot.id}
                  className={`bg-[#141418] border p-5 ${lot.is_current ? 'border-[#8A3CFF]' : 'border-[#1F1F24]'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] text-[#5B5B66] uppercase block">Ordem #{lot.sort_order}</span>
                      <div className="font-persona text-2xl uppercase tracking-tight flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-[#8A3CFF]" />
                        {lot.name}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="font-persona text-3xl text-[#8A3CFF] mb-4">{formatPrice(lot.price_cents)}</div>

                  <div className="grid grid-cols-3 gap-2 mb-2 text-center">
                    <div className="bg-[#0B0B0D] border border-[#1F1F24] p-2">
                      <span className="text-[9px] text-[#5B5B66] uppercase block">Vendidos</span>
                      <strong className="text-emerald-400 text-sm">{lot.sold}</strong>
                    </div>
                    <div className="bg-[#0B0B0D] border border-[#1F1F24] p-2">
                      <span className="text-[9px] text-[#5B5B66] uppercase block">Reservados</span>
                      <strong className="text-amber-400 text-sm">{lot.reserved}</strong>
                    </div>
                    <div className="bg-[#0B0B0D] border border-[#1F1F24] p-2">
                      <span className="text-[9px] text-[#5B5B66] uppercase block">Disponíveis</span>
                      <strong className="text-[#E8E8EF] text-sm">{lot.available}</strong>
                    </div>
                  </div>

                  <div className="w-full bg-[#0B0B0D] h-2 border border-[#1F1F24] flex mb-1">
                    <div className="h-full bg-emerald-400" style={{ width: `${soldPct}%` }} />
                    <div className="h-full bg-amber-400" style={{ width: `${reservedPct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#5B5B66] block mb-1">
                    {occupied} de {lot.capacity} ocupados
                  </span>
                  <span className="text-[10px] text-[#F5C400] flex items-center gap-1 mb-4">
                    <Wallet className="w-3 h-3" /> Arrecadado neste lote: <strong>{formatPrice(lot.revenue_cents ?? 0)}</strong>
                  </span>

                  <div className="space-y-1 text-[10px] text-[#5B5B66] mb-4">
                    <div className="flex justify-between">
                      <span className="uppercase">Início</span>
                      <span className="text-[#E8E8EF]">{lot.starts_at ? formatDateTime(lot.starts_at) : 'Imediato'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase">Fim</span>
                      <span className="text-[#E8E8EF]">{lot.ends_at ? formatDateTime(lot.ends_at) : 'Até esgotar'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(lot)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#1F1F24] hover:border-[#8A3CFF] uppercase text-[10px] transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-[#8A3CFF]" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(lot)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#1F1F24] hover:border-[#8A3CFF] uppercase text-[10px] transition-colors"
                    >
                      <Power className={`w-3 h-3 ${lot.is_active ? 'text-amber-400' : 'text-emerald-400'}`} />
                      {lot.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(lot)}
                      title="Só é possível excluir lotes sem pedidos"
                      className="px-3 flex items-center justify-center py-2 border border-[#1F1F24] hover:border-[#FF2E3B] transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-[#FF2E3B]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
