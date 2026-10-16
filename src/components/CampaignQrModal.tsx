'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, Download, Copy, Check, ExternalLink } from 'lucide-react';

interface CampaignQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOURCES = [
  { id: 'poster', label: 'Cartaz / Poster de Rua' },
  { id: 'flyer', label: 'Flyer Impresso' },
  { id: 'instagram', label: 'Instagram Stories / Bio' },
  { id: 'whatsapp', label: 'Grupos de WhatsApp' },
  { id: 'referral', label: 'Indicação / Referral' },
  { id: 'direct', label: 'Link Direto' },
];

export function CampaignQrModal({ isOpen, onClose }: CampaignQrModalProps) {
  const [selectedSource, setSelectedSource] = useState('poster');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const campaignUrl = `${origin}?source=${selectedSource}`;

  useEffect(() => {
    if (!campaignUrl) return;

    QRCode.toDataURL(campaignUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Erro ao gerar QR Code de campanha:', err));
  }, [campaignUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(campaignUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qrcode-mask-party-${selectedSource}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 text-white border-2 border-white w-full max-w-lg p-6 relative shadow-[8px_8px_0px_0px_#FF5722] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <QrIcon className="w-4 h-4 text-[#FF5722]" />
          <span className="text-[10px] font-mono uppercase text-[#FF5722] tracking-widest block">
            // DIVULGAÇÃO & TRACKING
          </span>
        </div>

        <h3 className="ascend-font text-3xl uppercase tracking-tight mb-2">
          QR CODE DE <span className="text-yellow-ascend">DIVULGAÇÃO</span>
        </h3>
        <p className="text-xs text-zinc-400 mb-6 font-sans">
          Gere QR Codes personalizados para cartazes, flyers ou redes sociais com rastreamento automático de origem.
        </p>

        {/* Seletor de Origem da Campanha */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
            Selecione o Canal de Divulgação:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSource(s.id)}
                className={`p-2.5 text-left border text-xs font-mono transition-all ${
                  selectedSource === s.id
                    ? 'border-[#FF5722] bg-[#FF5722] text-black font-black shadow-[2px_2px_0px_0px_#fff]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Preview */}
        <div className="bg-white text-black p-4 border-2 border-black text-center mb-6 shadow-[4px_4px_0px_0px_#000]">
          <div className="bg-black text-white p-2 mb-3 flex items-center justify-between">
            <span className="ascend-font text-lg uppercase tracking-wide">
              MASK PARTY <span className="text-yellow-ascend">2026</span>
            </span>
            <span className="text-[9px] font-mono uppercase bg-[#FF5722] text-black px-1.5 py-0.5 font-bold">
              SOURCE: {selectedSource.toUpperCase()}
            </span>
          </div>

          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code da Campanha" className="w-52 h-52 mx-auto" />
          ) : (
            <div className="w-52 h-52 bg-zinc-200 animate-pulse mx-auto flex items-center justify-center font-mono text-xs">
              Gerando...
            </div>
          )}

          <p className="text-[10px] font-bold uppercase text-zinc-600 mt-2 font-mono">
            Aponte a câmera para se inscrever na fila de espera
          </p>
        </div>

        {/* URL Gerada */}
        <div className="bg-zinc-900 border border-zinc-800 p-3 mb-6 font-mono text-xs text-zinc-300 flex items-center justify-between gap-2 overflow-hidden">
          <span className="truncate">{campaignUrl}</span>
          <button
            onClick={handleCopyLink}
            className="flex-shrink-0 text-[#FF5722] hover:text-orange-400 font-bold uppercase text-[10px] flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleDownloadQr}
            className="bg-[#FF5722] hover:bg-orange-500 text-black font-black py-3 px-4 uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-2 border-black transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Imagem (PNG)</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-yellow-ascend" />
            <span>Copiar Link Direto</span>
          </button>
        </div>
      </div>
    </div>
  );
}
