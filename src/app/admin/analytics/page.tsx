'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  Share2,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

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

  // Se não estiver logado, redireciona ou pede login
  if (!password) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-black border-2 border-white p-8 max-w-sm w-full text-center shadow-[8px_8px_0px_0px_#FF5722]">
          <span className="text-[10px] font-mono uppercase text-[#FF5722] tracking-widest block mb-2">
            // AUTENTICAÇÃO NECESSÁRIA
          </span>
          <h2 className="ascend-font text-3xl uppercase tracking-tight text-white mb-4">
            ACESSO <span className="text-yellow-ascend">RESTRITO</span>
          </h2>
          <p className="text-xs text-zinc-400 font-mono mb-6">
            Por favor, faça login primeiro no painel principal de administração.
          </p>
          <Link
            href="/admin"
            className="w-full inline-block bg-[#FF5722] hover:bg-orange-500 text-black font-black py-3 px-4 uppercase text-xs tracking-wider border-2 border-black transition-colors"
          >
            Ir para o Login Admin &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const maxDayCount = data ? Math.max(...data.byDay.map((d) => d.count), 1) : 1;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      {/* Top Header com Abas de Navegação */}
      <header className="max-w-7xl mx-auto border-b-2 border-zinc-800 pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 bg-zinc-900 border border-zinc-700 hover:border-[#FF5722] text-zinc-400 hover:text-white transition-colors"
              title="Voltar ao site"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="ascend-font text-3xl uppercase tracking-tight text-white">
                MASK PARTY <span className="text-[#FF5722]">// ANALYTICS & INSIGHTS</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mt-0.5">
                EPIC 4: FUNIL DE CONVERSÃO, DEMOGRAFIA E ATRIBUIÇÃO DE CAMPANHAS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <button
              onClick={() => fetchAnalytics()}
              disabled={loading}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs uppercase text-zinc-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-yellow-ascend ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação do Admin */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Link
            href="/admin"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wider transition-colors"
          >
            📋 Gestão da Fila
          </Link>
          <div className="px-4 py-2 bg-[#FF5722] text-black font-black border-2 border-white/80 uppercase tracking-wider shadow-[2px_2px_0px_0px_#fff]">
            📊 Métricas & Analytics
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-950/80 border border-red-500 text-red-200 text-xs font-mono">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="max-w-7xl mx-auto py-20 text-center text-zinc-500 font-mono uppercase text-sm">
          Calculando métricas da fila...
        </div>
      ) : !data ? null : (
        <div className="max-w-7xl mx-auto space-y-10">
          {/* 1. CARDS DE RESUMO EXECUTIVO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#FF5722]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">TOTAL DE INSCRITOS</span>
              <div className="ascend-font text-5xl text-white mt-1">{data.summary.totalLeads}</div>
              <span className="text-[10px] font-mono text-zinc-500 block mt-1">Leads únicos na fila</span>
            </div>

            <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#F3FF33]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">CONVOCADOS</span>
              <div className="ascend-font text-5xl text-yellow-ascend mt-1">{data.summary.notifiedCount}</div>
              <span className="text-[10px] font-mono text-zinc-500 block mt-1">E-mails de lote disparados</span>
            </div>

            <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#22c55e]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">CONVERSÃO FINAL</span>
              <div className="ascend-font text-5xl text-emerald-400 mt-1">
                {data.funnel.notifiedConversionRate}%
              </div>
              <span className="text-[10px] font-mono text-zinc-500 block mt-1">De notificados para pagantes</span>
            </div>

            <div className="bg-black border-2 border-zinc-800 p-5 shadow-[4px_4px_0px_0px_#38bdf8]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">MÉDIA DE IDADE</span>
              <div className="ascend-font text-5xl text-sky-400 mt-1">
                {data.summary.averageAge > 0 ? `${data.summary.averageAge} anos` : '--'}
              </div>
              <span className="text-[10px] font-mono text-zinc-500 block mt-1">Perfil do público</span>
            </div>
          </div>

          {/* 2. USER STORY 4: FUNIL DE CONVERSÃO (CONVERSION FUNNEL) */}
          <div className="bg-zinc-950 border-2 border-white/20 p-6 md:p-8 shadow-[6px_6px_0px_0px_#FF5722]">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#FF5722]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF5722]">
                // CONVERSION FUNNEL
              </span>
            </div>
            <h3 className="ascend-font text-3xl uppercase tracking-tight text-white mb-2">
              FUNIL DE CONVERSÃO <span className="text-yellow-ascend">DO EVENTO</span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans mb-8">
              Acompanhamento passo a passo: desde a entrada na lista de espera até a validação do ingresso no check-in.
            </p>

            <div className="space-y-4">
              {data.funnel.stages.map((stage, idx) => (
                <div key={idx} className="bg-black border border-zinc-800 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 font-mono text-xs">
                    <span className="font-bold text-white uppercase text-sm">{stage.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">{stage.description}</span>
                      <strong className="text-yellow-ascend text-base">{stage.count}</strong>
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 text-[10px]">
                        {stage.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barra visual do funil */}
                  <div className="w-full bg-zinc-900 h-3 overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF5722] to-yellow-ascend transition-all duration-500"
                      style={{ width: `${Math.max(stage.percentage, stage.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. USER STORY 1: INSCRIÇÕES POR DIA (REGISTRATIONS BY DAY) */}
          <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-yellow-ascend" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-ascend">
                // REGISTRATIONS BY DAY
              </span>
            </div>
            <h3 className="ascend-font text-3xl uppercase tracking-tight text-white mb-2">
              VOLUME DIÁRIO DE <span className="text-[#FF5722]">CADASTROS</span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans mb-8">
              Adesão ao longo do tempo e crescimento acumulado da lista de espera.
            </p>

            {data.byDay.length === 0 ? (
              <div className="text-center py-10 font-mono text-xs text-zinc-600">
                Nenhum registro por dia disponível.
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                <div className="grid grid-cols-12 text-[10px] text-zinc-500 uppercase pb-2 border-b border-zinc-800 font-black">
                  <div className="col-span-2">DATA</div>
                  <div className="col-span-7">GRÁFICO / VOLUME</div>
                  <div className="col-span-1 text-right">NOVOS</div>
                  <div className="col-span-2 text-right">ACUMULADO</div>
                </div>

                {data.byDay.map((dayItem, idx) => {
                  const barWidth = Math.round((dayItem.count / maxDayCount) * 100);
                  return (
                    <div key={idx} className="grid grid-cols-12 items-center text-xs py-1.5 hover:bg-zinc-900 transition-colors">
                      <div className="col-span-2 text-zinc-300 font-bold">{dayItem.displayDate}</div>
                      <div className="col-span-7 pr-4">
                        <div className="w-full bg-zinc-900 h-4 border border-zinc-800">
                          <div
                            className="h-full bg-[#FF5722] transition-all"
                            style={{ width: `${Math.max(barWidth, 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 text-right text-yellow-ascend font-bold">
                        +{dayItem.count}
                      </div>
                      <div className="col-span-2 text-right text-zinc-400 font-bold">
                        {dayItem.cumulative}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. USER STORY 5: ATRIBUIÇÃO DE CAMPANHAS (CAMPAIGN ATTRIBUTION) */}
          <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-[#FF5722]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF5722]">
                // CAMPAIGN ATTRIBUTION
              </span>
            </div>
            <h3 className="ascend-font text-3xl uppercase tracking-tight text-white mb-2">
              EFICÁCIA POR CANAL <span className="text-yellow-ascend">DE ORIGEM</span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans mb-8">
              Rastreamento de onde os participantes vieram (Flyers, Cartazes com QR, Instagram, Grupos de WhatsApp ou Link Direto).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
              {data.campaignAttribution.map((camp, idx) => (
                <div
                  key={idx}
                  className="bg-black border-2 border-zinc-800 p-5 hover:border-[#FF5722] transition-colors relative"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-[#FF5722] text-black text-[10px] font-black px-2 py-0.5 uppercase">
                      {camp.source}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold">{camp.percentage}% do total</span>
                  </div>

                  <div className="ascend-font text-4xl text-white mb-2">{camp.count} LEADS</div>

                  <div className="border-t border-zinc-800 pt-3 text-xs flex justify-between items-center text-zinc-400">
                    <span>Ingressos Pagos:</span>
                    <strong className="text-emerald-400">{camp.paidCount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 text-zinc-400">
                    <span>Taxa de Conversão:</span>
                    <strong className="text-yellow-ascend">{camp.conversionRate}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. USER STORIES 2 & 3: DEMOGRAFIA (BAIRROS & FAIXA ETÁRIA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registrations by Neighborhood */}
            <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-[#FF5722]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF5722]">
                  // REGISTRATIONS BY NEIGHBORHOOD
                </span>
              </div>
              <h3 className="ascend-font text-2xl uppercase tracking-tight text-white mb-2">
                TOP BAIRROS <span className="text-yellow-ascend">& REGIÕES</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans mb-6">
                Dados para segmentação em grupos de comunidade e engajamento pós-evento.
              </p>

              <div className="space-y-3 font-mono">
                {data.byNeighborhood.slice(0, 8).map((b, idx) => (
                  <div key={idx} className="bg-black border border-zinc-800 p-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-white font-bold uppercase">{b.neighborhood}</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-yellow-ascend">{b.count}</strong>
                        <span className="text-zinc-500 text-[10px]">({b.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-900 h-2">
                      <div
                        className="h-full bg-[#FF5722]"
                        style={{ width: `${Math.max(b.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Distribution */}
            <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-yellow-ascend" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-ascend">
                  // AGE DISTRIBUTION
                </span>
              </div>
              <h3 className="ascend-font text-2xl uppercase tracking-tight text-white mb-2">
                DISTRIBUIÇÃO DE <span className="text-[#FF5722]">IDADE</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans mb-6">
                Faixa etária do público para análise de perfil e adequação de campanhas.
              </p>

              <div className="space-y-3 font-mono">
                {data.ageDistribution.map((a, idx) => (
                  <div key={idx} className="bg-black border border-zinc-800 p-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-white font-bold">{a.range} ANOS</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-yellow-ascend">{a.count}</strong>
                        <span className="text-zinc-500 text-[10px]">({a.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-900 h-2">
                      <div
                        className="h-full bg-yellow-ascend"
                        style={{ width: `${Math.max(a.percentage, 2)}%` }}
                      />
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
