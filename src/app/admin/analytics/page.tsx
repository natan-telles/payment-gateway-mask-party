'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';
import { AdminNavTabs } from '@/components/AdminNavTabs';

interface AnalyticsData {
  summary: {
    totalLeads: number;
    notifiedCount: number;
    paidCount: number;
    averageAge: number;
  };
  byDay: Array<{
    date: string;
    displayDate: string;
    count: number;
    cumulative: number;
  }>;
  byNeighborhood: Array<{
    neighborhood: string;
    count: number;
    percentage: number;
  }>;
  ageDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  funnel: {
    stages: Array<{
      name: string;
      count: number;
      percentage: number;
      conversionFromNotified?: number;
      description: string;
    }>;
    overallConversionRate: number;
    notifiedConversionRate: number;
  };
  campaignAttribution: Array<{
    source: string;
    count: number;
    percentage: number;
    paidCount: number;
    conversionRate: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');

  useEffect(() => {
    const saved = sessionStorage.getItem('mask_party_admin_pw');
    if (saved) {
      setPassword(saved);
      fetchAnalytics(saved);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = async (authPass = password) => {
    if (!authPass) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'x-admin-password': authPass },
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Erro ao carregar dados de analytics.');
      }
    } catch {
      setError('Erro de conexão ao carregar analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex flex-col items-center justify-center p-4">
        <div className="bg-[#141418] border border-[#1F1F24] p-8 max-w-sm w-full text-center shadow-2xl">
          <span className="font-data text-[10px] uppercase text-[#8A3CFF] tracking-widest block mb-2">
            // AUTENTICAÇÃO NECESSÁRIA
          </span>
          <h2 className="font-persona text-3xl uppercase tracking-tight text-[#E8E8EF] mb-4">
            ACESSO RESTRITO
          </h2>
          <p className="text-xs text-[#5B5B66] font-data mb-6">
            Faça login primeiro no painel principal.
          </p>
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

  const maxDayCount = data ? Math.max(...data.byDay.map((d) => d.count), 1) : 1;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] p-4 md:p-8 font-sans">
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
                  BAILE DA LAGOA <span className="text-[#8A3CFF]">// ANALYTICS</span>
                </span>
                <span className="font-data text-[10px] text-[#5B5B66] uppercase tracking-widest block mt-0.5">
                  MÉTRICAS DE CONVERSÃO E DEMOGRAFIA
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="flex items-center gap-2 bg-[#141418] hover:bg-[#1f1f24] border border-[#1F1F24] px-3.5 py-2 text-xs font-data uppercase text-[#E8E8EF] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8A3CFF] ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Abas Padronizadas com Ícones da Paleta */}
        <AdminNavTabs activeTab="analytics" />
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-950/60 border border-[#FF2E3B]/50 text-[#FF2E3B] text-xs font-data">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="max-w-7xl mx-auto py-20 text-center text-[#5B5B66] font-data uppercase text-xs">
          Calculando métricas da fila...
        </div>
      ) : !data ? null : (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-data">
            <div className="bg-[#141418] border border-[#1F1F24] p-4">
              <span className="text-[10px] uppercase text-[#5B5B66] block">TOTAL DE INSCRITOS</span>
              <div className="font-persona text-4xl text-[#E8E8EF] mt-1">{data.summary.totalLeads}</div>
              <span className="text-[9px] text-[#5B5B66] block mt-1">Leads na fila</span>
            </div>

            <div className="bg-[#141418] border border-[#1F1F24] p-4">
              <span className="text-[10px] uppercase text-[#5B5B66] block">CONVOCADOS</span>
              <div className="font-persona text-4xl text-[#8A3CFF] mt-1">{data.summary.notifiedCount}</div>
              <span className="text-[9px] text-[#5B5B66] block mt-1">Lotes disparados</span>
            </div>

            <div className="bg-[#141418] border border-[#1F1F24] p-4">
              <span className="text-[10px] uppercase text-[#5B5B66] block">CONVERSÃO FINAL</span>
              <div className="font-persona text-4xl text-emerald-400 mt-1">
                {data.funnel.notifiedConversionRate}%
              </div>
              <span className="text-[9px] text-[#5B5B66] block mt-1">Notificados &rarr; Pagos</span>
            </div>

            <div className="bg-[#141418] border border-[#1F1F24] p-4">
              <span className="text-[10px] uppercase text-[#5B5B66] block">MÉDIA DE IDADE</span>
              <div className="font-persona text-4xl text-sky-400 mt-1">
                {data.summary.averageAge > 0 ? `${data.summary.averageAge} anos` : '--'}
              </div>
              <span className="text-[9px] text-[#5B5B66] block mt-1">Perfil do público</span>
            </div>
          </div>

          {/* FUNIL DE CONVERSÃO */}
          <div className="bg-[#141418] border border-[#1F1F24] p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#8A3CFF]" />
              <span className="font-data text-[10px] uppercase tracking-widest text-[#8A3CFF]">
                // CONVERSION FUNNEL
              </span>
            </div>
            <h3 className="font-persona text-2xl uppercase tracking-tight text-[#E8E8EF] mb-2">
              FUNIL DE CONVERSÃO
            </h3>
            <p className="text-xs text-[#5B5B66] font-data mb-6">
              Da fila de espera até a portaria do evento.
            </p>

            <div className="space-y-3 font-data">
              {data.funnel.stages.map((stage, idx) => (
                <div key={idx} className="bg-[#0B0B0D] border border-[#1F1F24] p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 text-xs">
                    <span className="font-bold text-[#E8E8EF] uppercase">{stage.name}</span>
                    <div className="flex items-center gap-3">
                      <strong className="text-[#8A3CFF] text-sm">{stage.count}</strong>
                      <span className="text-[#5B5B66] text-[10px]">
                        {stage.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-[#141418] h-2 border border-[#1F1F24]">
                    <div
                      className="h-full bg-[#8A3CFF] transition-all"
                      style={{ width: `${Math.max(stage.percentage, stage.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CADASTROS POR DIA */}
          <div className="bg-[#141418] border border-[#1F1F24] p-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#8A3CFF]" />
              <span className="font-data text-[10px] uppercase tracking-widest text-[#8A3CFF]">
                // REGISTRATIONS BY DAY
              </span>
            </div>
            <h3 className="font-persona text-2xl uppercase tracking-tight text-[#E8E8EF] mb-2">
              VOLUME DIÁRIO
            </h3>

            <div className="space-y-2 font-data text-xs mt-4">
              {data.byDay.map((dayItem, idx) => {
                const barWidth = Math.round((dayItem.count / maxDayCount) * 100);
                return (
                  <div key={idx} className="grid grid-cols-12 items-center py-1">
                    <div className="col-span-2 text-[#5B5B66]">{dayItem.displayDate}</div>
                    <div className="col-span-8 pr-4">
                      <div className="w-full bg-[#0B0B0D] h-3 border border-[#1F1F24]">
                        <div
                          className="h-full bg-[#8A3CFF]"
                          style={{ width: `${Math.max(barWidth, 3)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-[#E8E8EF] font-bold">
                      +{dayItem.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ATRIBUIÇÃO DE CAMPANHAS */}
          <div className="bg-[#141418] border border-[#1F1F24] p-6">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-3.5 h-3.5 text-[#8A3CFF]" />
              <span className="font-data text-[10px] uppercase tracking-widest text-[#8A3CFF]">
                // CAMPAIGN ATTRIBUTION
              </span>
            </div>
            <h3 className="font-persona text-2xl uppercase tracking-tight text-[#E8E8EF] mb-4">
              CANAL DE ORIGEM
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-data text-xs">
              {data.campaignAttribution.map((camp, idx) => (
                <div key={idx} className="bg-[#0B0B0D] border border-[#1F1F24] p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-[#8A3CFF] text-[#0B0B0D] text-[9px] font-bold px-1.5 py-0.5 uppercase">
                      {camp.source}
                    </span>
                    <span className="text-[10px] text-[#5B5B66]">{camp.percentage}%</span>
                  </div>
                  <div className="font-persona text-3xl text-[#E8E8EF] mb-2">{camp.count} LEADS</div>
                  <div className="text-[10px] text-[#5B5B66] flex justify-between">
                    <span>Conversão:</span>
                    <strong className="text-emerald-400">{camp.conversionRate}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DEMOGRAFIA: BAIRROS E IDADES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-data text-xs">
            <div className="bg-[#141418] border border-[#1F1F24] p-6">
              <span className="font-data text-[10px] uppercase text-[#8A3CFF] block mb-1">
                // BAIRROS (SJC)
              </span>
              <h4 className="font-persona text-xl uppercase text-[#E8E8EF] mb-4">Top Bairros</h4>
              <div className="space-y-2">
                {data.byNeighborhood.slice(0, 6).map((b, idx) => (
                  <div key={idx} className="bg-[#0B0B0D] border border-[#1F1F24] p-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#E8E8EF] uppercase">{b.neighborhood}</span>
                      <span className="text-[#8A3CFF]">{b.count}</span>
                    </div>
                    <div className="w-full bg-[#141418] h-1.5">
                      <div className="h-full bg-[#8A3CFF]" style={{ width: `${b.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#141418] border border-[#1F1F24] p-6">
              <span className="font-data text-[10px] uppercase text-[#8A3CFF] block mb-1">
                // FAIXA ETÁRIA
              </span>
              <h4 className="font-persona text-xl uppercase text-[#E8E8EF] mb-4">Idades</h4>
              <div className="space-y-2">
                {data.ageDistribution.map((a, idx) => (
                  <div key={idx} className="bg-[#0B0B0D] border border-[#1F1F24] p-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#E8E8EF]">{a.range} ANOS</span>
                      <span className="text-[#8A3CFF]">{a.count}</span>
                    </div>
                    <div className="w-full bg-[#141418] h-1.5">
                      <div className="h-full bg-[#8A3CFF]" style={{ width: `${a.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
