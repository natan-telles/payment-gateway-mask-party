'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, CheckCircle2, CircleAlert, Keyboard, ScanLine, X } from 'lucide-react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { AdminNavTabs } from '@/components/AdminNavTabs';
import { PersonaMaskIcon } from '@/components/PersonaMaskIcon';

const ADMIN_PW_KEY = 'mask_party_admin_pw';
const subscribeToNothing = () => () => {};

type CheckinResult = {
  success: boolean;
  status?: string;
  error?: string;
  name?: string;
  ticket_code?: string;
  checkin_at?: string;
};

function useAdminPassword() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => sessionStorage.getItem(ADMIN_PW_KEY) ?? '',
    () => null
  );
}

export default function CheckinPage() {
  const password = useAdminPassword();
  const [ticketCode, setTicketCode] = useState('');
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scanConsumedRef = useRef(false);

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    scanConsumedRef.current = false;
    setCameraActive(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const checkIn = useCallback(
    async (value: string) => {
      const normalized = value.trim();
      if (!normalized || submitting) return;

      if (normalized.startsWith('{')) {
        setResult({
          success: false,
          status: 'pre_sale_qr',
          error: 'Este é um QR Code de pré-venda, não um ingresso pago. Peça o QR Code enviado após a confirmação do pagamento.',
        });
        return;
      }

      setSubmitting(true);
      setResult(null);
      try {
        const response = await fetch('/api/admin/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': password ?? '' },
          body: JSON.stringify({ ticketCode: normalized }),
        });
        const data = (await response.json()) as CheckinResult;
        setResult(data);
        if (data.success) setTicketCode('');
      } catch {
        setResult({ success: false, error: 'Não foi possível comunicar com o servidor.' });
      } finally {
        setSubmitting(false);
      }
    },
    [password, submitting]
  );

  const startCamera = async () => {
    setCameraError(null);
    setResult(null);
    scanConsumedRef.current = false;
    setCameraActive(true);
    try {
      if (!videoRef.current) throw new Error('Vídeo indisponível.');

      const reader = new BrowserQRCodeReader();
      scannerControlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current,
        (scanResult, _scanError, controls) => {
          if (!scanResult || scanConsumedRef.current) return;
          scanConsumedRef.current = true;
          controls.stop();
          scannerControlsRef.current = null;
          setCameraActive(false);
          const value = scanResult.getText();
          void checkIn(value);
        }
      );
    } catch (error) {
      console.error('[CHECK-IN] Falha ao abrir câmera:', error);
      setCameraError('Não foi possível acessar a câmera. Verifique a permissão e tente novamente.');
      stopCamera();
    }
  };

  if (password === null) return <div className="min-h-screen bg-[#0B0B0D]" />;

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex items-center justify-center p-4">
        <div className="bg-[#141418] border border-[#1F1F24] p-8 max-w-sm w-full text-center shadow-2xl">
          <span className="font-data text-[10px] uppercase text-[#8A3CFF] tracking-widest block mb-2">{'// AUTENTICAÇÃO NECESSÁRIA'}</span>
          <h1 className="font-persona text-3xl uppercase mb-4">ACESSO RESTRITO</h1>
          <p className="text-xs text-[#5B5B66] font-data mb-6">Faça login primeiro no painel principal.</p>
          <Link href="/admin" className="block bg-[#8A3CFF] text-[#0B0B0D] font-persona text-lg py-3 uppercase">Ir para o Login Admin →</Link>
        </div>
      </div>
    );
  }

  const accepted = result?.success;
  const wasUsed = result?.status === 'already_checked_in';

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] p-4 md:p-8">
      <header className="max-w-4xl mx-auto border-b border-[#1F1F24] pb-6 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-1.5 bg-[#141418] border border-[#1F1F24] hover:border-[#8A3CFF] text-[#5B5B66] hover:text-[#E8E8EF]" title="Voltar"><ArrowLeft className="w-4 h-4" /></Link>
          <PersonaMaskIcon className="w-5 h-3.5" fillColor="#8A3CFF" />
          <div>
            <h1 className="font-persona text-3xl uppercase tracking-tight">BAILE DA LAGOA <span className="text-[#8A3CFF]">{'// PORTARIA'}</span></h1>
            <p className="font-data text-[10px] text-[#5B5B66] uppercase tracking-widest mt-0.5">VALIDAÇÃO DE INGRESSOS</p>
          </div>
        </div>
        <AdminNavTabs activeTab="checkin" />
      </header>

      <section className="max-w-xl mx-auto bg-[#141418] border border-[#1F1F24] p-5 md:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <ScanLine className="w-10 h-10 mx-auto text-[#8A3CFF] mb-3" />
          <h2 className="font-persona text-3xl uppercase">CHECK-IN</h2>
          <p className="font-data text-xs text-[#5B5B66] mt-2">Leia o QR Code do ingresso ou informe o código manualmente.</p>
        </div>

        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full aspect-square object-cover bg-black border border-[#8A3CFF] mb-3 ${cameraActive ? '' : 'hidden'}`}
        />

        <div className="flex gap-2 mb-3">
          <button onClick={cameraActive ? stopCamera : startCamera} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-[#8A3CFF] hover:bg-[#9a54ff] disabled:opacity-50 text-[#0B0B0D] font-data font-bold text-xs uppercase py-3">
            {cameraActive ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {cameraActive ? 'Fechar câmera' : 'Ler QR Code'}
          </button>
        </div>
        {cameraError && <p className="font-data text-xs text-amber-300 mb-3">{cameraError}</p>}

        <form onSubmit={(event) => { event.preventDefault(); void checkIn(ticketCode); }} className="flex gap-2">
          <label className="sr-only" htmlFor="ticket-code">Código do ingresso</label>
          <input id="ticket-code" value={ticketCode} onChange={(event) => setTicketCode(event.target.value.toUpperCase())} placeholder="EX.: MASK-ABC123" autoComplete="off" autoFocus className="min-w-0 flex-1 bg-[#0B0B0D] border border-[#1F1F24] focus:border-[#8A3CFF] outline-none px-3 py-3 font-data text-sm uppercase" />
          <button type="submit" disabled={submitting || !ticketCode.trim()} className="flex items-center justify-center gap-2 bg-[#1F1F24] hover:bg-[#28282f] disabled:opacity-50 px-4 font-data text-xs uppercase"><Keyboard className="w-4 h-4" /> Validar</button>
        </form>

        {result && (
          <div className={`mt-5 border p-5 text-center ${accepted ? 'border-emerald-500 bg-emerald-950/30' : wasUsed ? 'border-amber-500 bg-amber-950/30' : 'border-red-500 bg-red-950/30'}`}>
            {accepted ? <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" /> : <CircleAlert className={`w-10 h-10 mx-auto mb-2 ${wasUsed ? 'text-amber-400' : 'text-red-400'}`} />}
            <p className="font-persona text-2xl uppercase">{accepted ? 'ENTRADA LIBERADA' : wasUsed ? 'INGRESSO JÁ UTILIZADO' : 'ENTRADA NÃO LIBERADA'}</p>
            {result.name && <p className="font-data text-base text-[#E8E8EF] mt-2">{result.name}</p>}
            {result.ticket_code && <p className="font-data text-xs text-[#5B5B66] mt-1">{result.ticket_code}</p>}
            <p className="font-data text-xs text-[#B8B8C1] mt-3">{accepted ? 'Check-in registrado com sucesso.' : result.error || 'Não foi possível validar este ingresso.'}</p>
            {result.checkin_at && <p className="font-data text-[10px] text-[#5B5B66] mt-2">{new Date(result.checkin_at).toLocaleString('pt-BR')}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
