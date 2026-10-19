'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode as QrCodeIcon, X } from 'lucide-react';

interface ShareSiteQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSiteQrModal({ isOpen, onClose }: ShareSiteQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const siteUrlRef = useRef('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const url = window.location.origin;
    siteUrlRef.current = url;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: '#0B0B0D', light: '#E8E8EF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrlRef.current);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // O QR continua sendo a alternativa de compartilhamento se a cópia falhar.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-qr-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm border border-[#8A3CFF] bg-[#141418] p-6 text-center shadow-2xl">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 p-1 text-[#5B5B66] hover:text-[#E8E8EF]">
          <X className="h-5 w-5" />
        </button>
        <QrCodeIcon className="mx-auto mb-3 h-8 w-8 text-[#8A3CFF]" />
        <h2 id="share-qr-title" className="font-persona text-3xl uppercase">COMPARTILHE O BAILE</h2>
        <p className="mt-2 font-data text-xs text-[#5B5B66]">Aponte a câmera para abrir a página de inscrição.</p>

        <div className="mx-auto my-5 inline-block border border-[#1F1F24] bg-[#E8E8EF] p-3">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL gerada localmente
            <img src={qrDataUrl} alt="QR Code para abrir o site do Baile da Lagoa" className="h-56 w-56" />
          ) : (
            <div className="h-56 w-56 animate-pulse bg-[#C9C9D0]" aria-label="Gerando QR Code" />
          )}
        </div>

        <button onClick={copyLink} className="flex w-full items-center justify-center gap-2 bg-[#8A3CFF] py-3 font-data text-xs font-bold uppercase text-[#0B0B0D] hover:bg-[#9A54FF]">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>
    </div>
  );
}
