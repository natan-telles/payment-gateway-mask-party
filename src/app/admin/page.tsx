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
} from 'lucide-react';
import { WaitingQueueEntry } from '@/types/database';

export default function AdminPage() {
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

  // Recupera senha salva na sessão
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
    link.setAttribute('download', `mask-party-fila-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enviar WhatsApp direto com template da Mask Party
  const handleNotifyWhatsApp = (lead: WaitingQueueEntry) => {
    const rawPhone = lead.phone.replace(/\D/g, '');
    const phoneWithDDI = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    const text = encodeURIComponent(
      `Olá, ${lead.name.split(' ')[0]}! 🎭\n\nSua prioridade na fila da *MASK PARTY 2026* chegou! (Posição #${lead.queue_position}).\n\nSeu acesso exclusivo para compra de ingresso no 1º Lote está liberado. Complete seu pagamento via PIX para garantir sua vaga antes do tempo limite de expiração.\n\nAcesse o link de compra: ${window.location.origin}?pix=active`
    );

    const waUrl = `https://wa.me/${phoneWithDDI}?text=${text}`;
    window.open(waUrl, '_blank');

    // Marca como notificado automaticamente
    updateStatus(lead.id, { notification_status: 'sent' });
  };

  // TELA DE LOGIN DO ADMIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-black border-2 border-white p-8 shadow-[8px_8px_0px_0px_#FF5722] text-center">
          <div className="w-12 h-12 bg-black border border-white mx-auto flex items-center justify-center mb-4 text-[#FF5722]">
            <Lock className="w-6 h-6" />
          </div>

          <span className="text-[10px] uppercase font-mono tracking-widest text-[#FF5722] block mb-1">
            // ÁREA RESTRITA
          </span>
          <h1 className="ascend-font text-3xl uppercase tracking-tight text-white mb-2">
            ADMIN <span className="text-yellow-ascend">DASHBOARD</span>
          </h1>
          <p className="text-xs text-zinc-400 mb-6 font-mono">
            Painel de controle e gerenciamento da fila da Mask Party.
          </p>

          {authError && (
            <div className="mb-4 p-2.5 bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold font-mono">
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="SENHA DE ACESSO"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[#FF5722] text-white p-3 font-mono text-center text-lg tracking-widest uppercase outline-none"
              autoFocus
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF5722] hover:bg-orange-500 text-black font-black py-3 px-4 uppercase text-xs tracking-wider border-2 border-black transition-colors"
            >
              {loading ? 'Verificando...' : 'Entrar no Painel'}
            </button>
          </form>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs font-mono uppercase mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Landing Page</span>
          </Link>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL DO PAINEL ADMIN
  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      {/* Top Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-zinc-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 bg-zinc-900 border border-zinc-700 hover:border-[#FF5722] text-zinc-400 hover:text-white transition-colors"
              title="Voltar ao site"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="ascend-font text-3xl uppercase tracking-tight">
              MASK PARTY <span className="text-[#FF5722]">// ADMIN DASHBOARD</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mt-1">
            EPIC 2: GESTÃO DA FILA IMUTÁVEL & PREVENÇÃO DE DUPLICIDADE
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <button
            onClick={() => fetchLeads()}
            disabled={loading}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs uppercase text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-yellow-ascend ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!leads.length}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs uppercase text-[#FF5722] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-950/60 hover:bg-red-900 border border-red-700 px-3.5 py-2 text-xs uppercase text-red-200 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#FF5722]">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[10px] font-mono uppercase font-black">TOTAL NA FILA</span>
              <Users className="w-4 h-4 text-[#FF5722]" />
            </div>
            <div className="ascend-font text-5xl text-white leading-none">{metrics.total}</div>
            <span className="text-[10px] font-mono text-zinc-500 block mt-2">Leads únicos registrados</span>
          </div>

          <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#F3FF33]">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[10px] font-mono uppercase font-black">NOTIFICADOS</span>
              <Bell className="w-4 h-4 text-yellow-ascend" />
            </div>
            <div className="ascend-font text-5xl text-yellow-ascend leading-none">
              {metrics.notifiedCount}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 block mt-2">Chamados para comprar</span>
          </div>

          <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#22c55e]">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[10px] font-mono uppercase font-black">PAGOS / INGRESSO</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="ascend-font text-5xl text-emerald-400 leading-none">
              {metrics.paidCount}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 block mt-2">Ingressos emitidos</span>
          </div>

          <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#f97316]">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[10px] font-mono uppercase font-black">PAGTO. PENDENTE</span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="ascend-font text-5xl text-orange-400 leading-none">
              {metrics.pendingPaymentCount}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 block mt-2">Aguardando PIX</span>
          </div>
        </div>

        {/* BARRA DE FILTROS & BUSCA */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#FF5722]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto font-mono text-xs">
            <select
              value={notificationFilter}
              onChange={(e) => setNotificationFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 p-2.5 outline-none text-xs"
            >
              <option value="all">Notificação: Todas</option>
              <option value="pending">Notificação: Pendente</option>
              <option value="sent">Notificação: Enviada</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 p-2.5 outline-none text-xs"
            >
              <option value="all">Pagamento: Todos</option>
              <option value="pending">Pagamento: Pendente</option>
              <option value="approved">Pagamento: Aprovado</option>
              <option value="expired">Pagamento: Expirado</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-300 p-2.5 outline-none text-xs"
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
        <div className="bg-black border-2 border-white/20 overflow-x-auto shadow-[6px_6px_0px_0px_#000]">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900 border-b-2 border-zinc-700 text-zinc-400 uppercase text-[10px]">
                <th className="p-3.5 w-16 text-center">POS</th>
                <th className="p-3.5">PARTICIPANTE</th>
                <th className="p-3.5">WHATSAPP / CONTATO</th>
                <th className="p-3.5">SEGMENTO</th>
                <th className="p-3.5">ORIGEM</th>
                <th className="p-3.5">DATA / HORA</th>
                <th className="p-3.5">NOTIFICAÇÃO</th>
                <th className="p-3.5">PAGAMENTO</th>
                <th className="p-3.5 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500 font-mono uppercase">
                    {loading ? 'Carregando dados...' : 'Nenhum lead encontrado com os filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isNotified = lead.notification_status === 'sent';
                  const isPaid = lead.payment_status === 'approved';

                  return (
                    <tr key={lead.id} className="hover:bg-zinc-950 transition-colors">
                      {/* Posição Imutável */}
                      <td className="p-3.5 text-center">
                        <span className="ascend-font text-lg text-yellow-ascend font-black">
                          #{String(lead.queue_position).padStart(4, '0')}
                        </span>
                      </td>

                      {/* Nome e E-mail */}
                      <td className="p-3.5">
                        <strong className="block uppercase text-white font-sans text-sm">
                          {lead.name}
                        </strong>
                        <span className="text-[11px] text-zinc-400 lowercase">{lead.email}</span>
                      </td>

                      {/* WhatsApp com link rápido */}
                      <td className="p-3.5">
                        <a
                          href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold"
                          title="Abrir WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{lead.phone}</span>
                        </a>
                      </td>

                      {/* Bairro, Idade, Instagram */}
                      <td className="p-3.5 text-[11px] text-zinc-400">
                        {lead.neighborhood && <span className="block text-zinc-300">{lead.neighborhood}</span>}
                        {lead.age && <span className="text-zinc-500">{lead.age} anos</span>}
                        {lead.instagram && (
                          <span className="text-yellow-ascend block font-sans">{lead.instagram}</span>
                        )}
                        {!lead.neighborhood && !lead.age && !lead.instagram && (
                          <span className="text-zinc-600">--</span>
                        )}
                      </td>

                      {/* Origem */}
                      <td className="p-3.5">
                        <span className="inline-block bg-zinc-900 border border-zinc-700 px-2 py-0.5 uppercase text-[9px] text-zinc-300">
                          {lead.source}
                        </span>
                      </td>

                      {/* Data / Hora de Inscrição */}
                      <td className="p-3.5 text-[11px] text-zinc-400 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Status Notificação */}
                      <td className="p-3.5">
                        <button
                          onClick={() =>
                            updateStatus(lead.id, {
                              notification_status: isNotified ? 'pending' : 'sent',
                            })
                          }
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                            isNotified
                              ? 'bg-yellow-ascend text-black'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                          title="Clique para alternar o status"
                        >
                          {isNotified ? 'Enviada' : 'Pendente'}
                        </button>
                      </td>

                      {/* Status Pagamento */}
                      <td className="p-3.5">
                        <button
                          onClick={() =>
                            updateStatus(lead.id, {
                              payment_status: isPaid ? 'pending' : 'approved',
                            })
                          }
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                            isPaid
                              ? 'bg-emerald-500 text-black'
                              : lead.payment_status === 'expired'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                          title="Clique para alternar status do pagamento"
                        >
                          {lead.payment_status.toUpperCase()}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleNotifyWhatsApp(lead)}
                            className="p-1.5 bg-[#FF5722] hover:bg-orange-500 text-black font-bold"
                            title="Disparar link de pagamento no WhatsApp"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(lead.id, lead.name)}
                            className="p-1.5 bg-zinc-900 hover:bg-red-900 text-zinc-400 hover:text-white"
                            title="Excluir da fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
