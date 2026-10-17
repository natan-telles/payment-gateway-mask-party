'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Lock,
  Search,
  RefreshCw,
  Download,
  Users,
  Bell,
  CheckCircle,
  Clock,
  Trash2,
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  Mail,
  Send,
  X,
} from 'lucide-react';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';
import { AdminNavTabs } from '@/components/AdminNavTabs';
import { WaitingQueueEntry } from '@/types/database';
import { useCurrentLot } from '@/hooks/useCurrentLot';

export default function AdminPage() {
  const lot = useCurrentLot();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [leads, setLeads] = useState<WaitingQueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    total: 0,
    notifiedCount: 0,
    paidCount: 0,
    pendingPaymentCount: 0,
  });

  const [search, setSearch] = useState('');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [expirationHours, setExpirationHours] = useState(12);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseFeedback, setReleaseFeedback] = useState<string | null>(null);

  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('mask_party_admin_pw');
    if (saved) {
      setPassword(saved);
      verifyPassword(saved);
    }
  }, []);

  const verifyPassword = async (passToVerify: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passToVerify }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('mask_party_admin_pw', passToVerify);
        fetchLeads(passToVerify);
      } else {
        setAuthError(data.error || 'Senha incorreta');
        setIsAuthenticated(false);
      }
    } catch {
      setAuthError('Erro na conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = useCallback(
    async (authPass = password) => {
      if (!authPass) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (notificationFilter !== 'all') params.set('notification_status', notificationFilter);
        if (paymentFilter !== 'all') params.set('payment_status', paymentFilter);
        if (sourceFilter !== 'all') params.set('source', sourceFilter);

        const res = await fetch(`/api/admin/queue?${params.toString()}`, {
          headers: { 'x-admin-password': authPass },
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setLeads(json.data);
          setMetrics(json.metrics);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    },
    [password, search, notificationFilter, paymentFilter, sourceFilter]
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
    }
  }, [isAuthenticated, fetchLeads]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mask_party_admin_pw');
    setIsAuthenticated(false);
    setPassword('');
    setLeads([]);
  };

  const updateStatus = async (
    id: string,
    updates: {
      notification_status?: string;
      payment_status?: string;
    }
  ) => {
    try {
      const res = await fetch('/api/admin/queue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover ${name} da fila de espera?`)) return;

    try {
      const res = await fetch(`/api/admin/queue?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });

      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Erro ao remover lead:', err);
    }
  };

  const handleExportCsv = () => {
    if (!leads.length) return;

    const headers = [
      'Posição',
      'Nome',
      'Telefone',
      'E-mail',
      'Idade',
      'Bairro',
      'Instagram',
      'Origem',
      'Status Notificação',
      'Status Pagamento',
      'Código Ticket',
      'Data Cadastro',
    ];

    const rows = leads.map((l) => [
      l.queue_position,
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.email}"`,
      l.age || '',
      `"${l.neighborhood || ''}"`,
      `"${l.instagram || ''}"`,
      l.source,
      l.notification_status,
      l.payment_status,
      l.ticket_code || '',
      new Date(l.created_at).toLocaleString('pt-BR'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baile-persona-fila-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNotifyWhatsApp = (lead: WaitingQueueEntry) => {
    const rawPhone = lead.phone.replace(/\D/g, '');
    const phoneWithDDI = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    const text = encodeURIComponent(
      `Olá, ${lead.name.split(' ')[0]}!\n\nSua prioridade na fila do *BAILE PERSONA (31.10 · SJC)* chegou (Posição #${lead.queue_position}).\n\nSeu acesso para compra de ingresso no ${lot.name} está liberado por tempo limitado.\n\nLink de compra: ${window.location.origin}?checkout=true&lead=${lead.id}&pos=${lead.queue_position}`
    );

    const waUrl = `https://wa.me/${phoneWithDDI}?text=${text}`;
    window.open(waUrl, '_blank');

    updateStatus(lead.id, { notification_status: 'sent' });
  };

  const handleReleaseBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReleasing(true);
    setReleaseFeedback(null);

    try {
      const res = await fetch('/api/admin/notifications/release-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ count: batchCount, expirationHours }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const mode = data.simulated ? ' (Modo Simulação)' : ' (Resend Real)';
        setReleaseFeedback(`Sucesso: ${data.releasedCount} participante(s) notificado(s) na ordem da fila${mode}.`);
        fetchLeads();
      } else {
        setReleaseFeedback(`Erro: ${data.error || 'Falha ao liberar lote.'}`);
      }
    } catch {
      setReleaseFeedback('Erro de conexão ao disparar lote.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleSendReminders = async () => {
    if (!confirm('Deseja disparar e-mails de lembrete para todos os participantes com pagamento pendente?')) return;

    setIsSendingReminders(true);
    setReminderFeedback(null);

    try {
      const res = await fetch('/api/admin/notifications/send-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReminderFeedback(`Lembretes enviados para ${data.remindedCount} participante(s).`);
        setTimeout(() => setReminderFeedback(null), 5000);
      } else {
        alert(data.error || 'Erro ao enviar lembretes.');
      }
    } catch {
      alert('Erro de conexão ao enviar lembretes.');
    } finally {
      setIsSendingReminders(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#141418] border border-[#1F1F24] p-8 text-center shadow-2xl">
          <div className="w-10 h-10 bg-[#8A3CFF] mx-auto flex items-center justify-center mb-4">
            <PersonaMaskIcon className="w-6 h-4" fillColor="#0B0B0D" />
          </div>

          <span className="font-data text-[10px] uppercase text-[#8A3CFF] tracking-widest block mb-1">
            // ÁREA RESTRITA
          </span>
          <h1 className="font-persona text-3xl uppercase tracking-tight text-[#E8E8EF] mb-2">
            ADMIN DASHBOARD
          </h1>
          <p className="text-xs text-[#5B5B66] mb-6 font-data">
            Baile Persona · Controle de Fila e Ingressos
          </p>

          {authError && (
            <div className="mb-4 p-2.5 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs font-data">
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 font-data">
            <input
              type="password"
              placeholder="SENHA DE ACESSO"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] p-3 text-center text-sm tracking-widest uppercase outline-none"
              autoFocus
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-persona text-lg py-3 px-4 uppercase tracking-normal transition-colors"
            >
              {loading ? 'VERIFICANDO...' : 'ENTRAR NO PAINEL'}
            </button>
          </form>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[#5B5B66] hover:text-[#E8E8EF] text-xs font-data uppercase mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao site</span>
          </Link>
        </div>
      </div>
    );
  }

  const waitingCount = metrics.total - metrics.notifiedCount;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] p-4 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto border-b border-[#1F1F24] pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF] text-[#5B5B66] hover:text-[#E8E8EF] transition-colors"
                title="Voltar ao site"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <PersonaMaskIcon className="w-5 h-3.5" fillColor="#8A3CFF" />
                <span className="font-persona text-3xl uppercase tracking-tight text-[#E8E8EF]">
                  BAILE PERSONA <span className="text-[#8A3CFF]">// ADMIN</span>
                </span>
              </div>
            </div>
            <span className="font-data text-[10px] text-[#5B5B66] uppercase tracking-widest block mt-1">
              GESTÃO DA FILA IMUTÁVEL · 31.10 · SJC
            </span>
          </div>

          <div className="flex items-center gap-3 font-data text-xs">
            <button
              onClick={() => fetchLeads()}
              disabled={loading}
              className="flex items-center gap-2 bg-[#141418] hover:bg-[#1f1f24] border border-[#1F1F24] px-3.5 py-2 uppercase text-[#E8E8EF] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#8A3CFF] ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={!leads.length}
              className="flex items-center gap-2 bg-[#141418] hover:bg-[#1f1f24] border border-[#1F1F24] px-3.5 py-2 uppercase text-[#8A3CFF] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-950/40 hover:bg-red-900 border border-red-800 px-3.5 py-2 uppercase text-red-300 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Abas Padronizadas com Ícones da Paleta */}
        <AdminNavTabs activeTab="queue" />
      </header>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-data">
          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[10px] text-[#5B5B66] uppercase block">TOTAL NA FILA</span>
            <div className="font-persona text-4xl text-[#E8E8EF] mt-1">{metrics.total}</div>
            <span className="text-[9px] text-[#5B5B66] block mt-1">Inscritos únicos</span>
          </div>

          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[10px] text-[#5B5B66] uppercase block">CONVOCADOS</span>
            <div className="font-persona text-4xl text-[#8A3CFF] mt-1">{metrics.notifiedCount}</div>
            <span className="text-[9px] text-[#5B5B66] block mt-1">E-mails disparados</span>
          </div>

          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[10px] text-[#5B5B66] uppercase block">PAGOS / INGRESSOS</span>
            <div className="font-persona text-4xl text-emerald-400 mt-1">{metrics.paidCount}</div>
            <span className="text-[9px] text-[#5B5B66] block mt-1">PIX confirmados</span>
          </div>

          <div className="bg-[#141418] border border-[#1F1F24] p-4">
            <span className="text-[10px] text-[#5B5B66] uppercase block">PAGTO. PENDENTE</span>
            <div className="font-persona text-4xl text-[#FF2E3B] mt-1">{metrics.pendingPaymentCount}</div>
            <span className="text-[9px] text-[#5B5B66] block mt-1">Aguardando PIX</span>
          </div>
        </div>

        {/* BARRA DE AÇÃO: LIBERAÇÃO DE LOTE E LEMBRETES */}
        <div className="bg-[#141418] border border-[#1F1F24] p-5 flex flex-col md:flex-row items-center justify-between gap-4 font-data text-xs">
          <div>
            <span className="text-[10px] text-[#8A3CFF] uppercase tracking-widest block mb-0.5">
              // DISPARO OFICIAL
            </span>
            <strong className="text-sm uppercase text-[#E8E8EF]">
              Liberação de Lote por E-mail
            </strong>
            <p className="text-[11px] text-[#5B5B66] mt-0.5">
              Convoca os próximos inscritos respeitando estritamente o carimbo de entrada na fila.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setReleaseFeedback(null);
                setIsReleaseModalOpen(true);
              }}
              className="bg-[#8A3CFF] hover:bg-[#9a54ff] text-[#0B0B0D] font-bold py-2.5 px-4 uppercase text-xs tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Liberar Lote</span>
            </button>

            <button
              onClick={handleSendReminders}
              disabled={isSendingReminders || metrics.pendingPaymentCount === 0}
              className="bg-[#0B0B0D] hover:bg-[#1f1f24] disabled:opacity-40 text-[#E8E8EF] py-2.5 px-3.5 uppercase text-xs tracking-wider border border-[#1F1F24] flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-[#8A3CFF]" />
              <span>Lembretes ({metrics.pendingPaymentCount})</span>
            </button>
          </div>
        </div>

        {reminderFeedback && (
          <div className="p-3 bg-[#141418] border border-[#8A3CFF] text-[#E8E8EF] text-xs font-data">
            {reminderFeedback}
          </div>
        )}

        {/* FILTROS E BUSCA */}
        <div className="bg-[#141418] border border-[#1F1F24] p-3 flex flex-col md:flex-row items-center gap-3 font-data text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-[#5B5B66] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0B0B0D] border border-[#1F1F24] pl-9 pr-3 py-2 text-xs text-[#E8E8EF] placeholder-[#5B5B66] outline-none focus:border-[#8A3CFF]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={notificationFilter}
              onChange={(e) => setNotificationFilter(e.target.value)}
              className="bg-[#0B0B0D] border border-[#1F1F24] text-[#E8E8EF] p-2 outline-none text-xs"
            >
              <option value="all">Notificação: Todas</option>
              <option value="pending">Pendente</option>
              <option value="sent">Enviada</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-[#0B0B0D] border border-[#1F1F24] text-[#E8E8EF] p-2 outline-none text-xs"
            >
              <option value="all">Pagamento: Todos</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="expired">Expirado</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#0B0B0D] border border-[#1F1F24] text-[#E8E8EF] p-2 outline-none text-xs"
            >
              <option value="all">Origem: Todas</option>
              <option value="poster">Poster</option>
              <option value="flyer">Flyer</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="direct">Direto</option>
            </select>
          </div>
        </div>

        {/* TABELA DE GESTÃO DA FILA */}
        <div className="bg-[#141418] border border-[#1F1F24] overflow-x-auto">
          <table className="w-full text-left font-data text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B0B0D] border-b border-[#1F1F24] text-[#5B5B66] uppercase text-[9px]">
                <th className="p-3 text-center">POS</th>
                <th className="p-3">PARTICIPANTE</th>
                <th className="p-3">CONTATO</th>
                <th className="p-3">SEGMENTO</th>
                <th className="p-3">ORIGEM</th>
                <th className="p-3">REGISTRO</th>
                <th className="p-3">NOTIFICAÇÃO</th>
                <th className="p-3">PAGAMENTO</th>
                <th className="p-3 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F24]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#5B5B66] uppercase">
                    {loading ? 'Carregando dados...' : 'Nenhum lead encontrado com os filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isNotified = lead.notification_status === 'sent';
                  const isPaid = lead.payment_status === 'approved';

                  return (
                    <tr key={lead.id} className="hover:bg-[#1A1A20] transition-colors">
                      <td className="p-3 text-center">
                        <span className="font-persona text-base text-[#8A3CFF]">
                          #{String(lead.queue_position).padStart(4, '0')}
                        </span>
                      </td>

                      <td className="p-3">
                        <strong className="block uppercase text-[#E8E8EF] text-xs">
                          {lead.name}
                        </strong>
                        <span className="text-[10px] text-[#5B5B66] lowercase">{lead.email}</span>
                      </td>

                      <td className="p-3">
                        <a
                          href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold text-xs"
                          title="Abrir WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{lead.phone}</span>
                        </a>
                      </td>

                      <td className="p-3 text-[10px] text-[#5B5B66]">
                        {lead.neighborhood && <span className="block text-[#E8E8EF]">{lead.neighborhood}</span>}
                        {lead.age && <span>{lead.age} anos</span>}
                        {lead.instagram && <span className="text-[#8A3CFF] block">{lead.instagram}</span>}
                        {!lead.neighborhood && !lead.age && !lead.instagram && '--'}
                      </td>

                      <td className="p-3">
                        <span className="bg-[#0B0B0D] border border-[#1F1F24] px-1.5 py-0.5 uppercase text-[9px] text-[#5B5B66]">
                          {lead.source}
                        </span>
                      </td>

                      <td className="p-3 text-[10px] text-[#5B5B66] whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() =>
                            updateStatus(lead.id, {
                              notification_status: isNotified ? 'pending' : 'sent',
                            })
                          }
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-colors ${
                            isNotified
                              ? 'bg-[#8A3CFF] text-[#0B0B0D]'
                              : 'bg-[#0B0B0D] text-[#5B5B66] hover:text-[#E8E8EF]'
                          }`}
                        >
                          {isNotified ? 'Enviada' : 'Pendente'}
                        </button>
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() =>
                            updateStatus(lead.id, {
                              payment_status: isPaid ? 'pending' : 'approved',
                            })
                          }
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-colors ${
                            isPaid
                              ? 'bg-emerald-500 text-[#0B0B0D]'
                              : lead.payment_status === 'expired'
                              ? 'bg-[#FF2E3B] text-white'
                              : 'bg-[#0B0B0D] text-[#5B5B66] hover:text-[#E8E8EF]'
                          }`}
                        >
                          {lead.payment_status.toUpperCase()}
                        </button>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleNotifyWhatsApp(lead)}
                            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-[#0B0B0D] transition-colors"
                            title="Disparar no WhatsApp"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDelete(lead.id, lead.name)}
                            className="p-1.5 bg-red-950/20 hover:bg-red-900 text-red-400 hover:text-white transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE LIBERAÇÃO DE LOTE */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 bg-[#0B0B0D]/90 backdrop-blur-md z-50 flex items-center justify-center p-4 font-data">
          <div className="bg-[#141418] text-[#E8E8EF] border border-[#1F1F24] w-full max-w-sm p-6 relative shadow-2xl">
            <button
              onClick={() => setIsReleaseModalOpen(false)}
              className="absolute top-4 right-4 text-[#5B5B66] hover:text-[#E8E8EF] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[9px] uppercase text-[#8A3CFF] tracking-widest block mb-1">
              // DISPARO EM MASSA
            </span>
            <h3 className="font-persona text-2xl uppercase tracking-tight mb-2">
              LIBERAR LOTE DE INGRESSOS
            </h3>
            <p className="text-xs text-[#5B5B66] mb-6">
              Os e-mails serão disparados para os próximos participantes da fila por ordem cronológica.
            </p>

            {releaseFeedback && (
              <div className="mb-4 p-2.5 bg-[#0B0B0D] border border-[#1F1F24] text-xs">
                {releaseFeedback}
              </div>
            )}

            <form onSubmit={handleReleaseBatch} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-[#5B5B66] mb-1">
                  Quantidade a Liberar:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] p-2.5 font-bold outline-none"
                />
                <span className="text-[9px] text-[#5B5B66] mt-1 block">
                  Aguardando na fila: <strong>{waitingCount}</strong>
                </span>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-[#5B5B66] mb-1">
                  Prazo de Expiração (Horas):
                </label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(Number(e.target.value))}
                  className="w-full bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] text-[#E8E8EF] p-2.5 font-bold outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isReleasing || waitingCount === 0}
                className="w-full bg-[#8A3CFF] hover:bg-[#9a54ff] disabled:opacity-50 text-[#0B0B0D] font-persona text-lg py-3 px-4 uppercase tracking-normal flex items-center justify-center gap-2 transition-colors"
              >
                {isReleasing ? (
                  <span>DISPARANDO E-MAILS...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>CONFIRMAR DISPARO</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
