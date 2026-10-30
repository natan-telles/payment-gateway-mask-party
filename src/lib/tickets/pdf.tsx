import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { TicketKind } from '@/types/database';
import { logNotification } from '@/lib/notifications/log';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_LOT, lotLabels } from '@/lib/lots/labels';

// Gera o PDF do ingresso (pago ou cortesia) com o mesmo QR Code que a portaria lê.
// Formato vertical (proporção de tela de celular) para ser apresentado no check-in.

export const EVENT_INFO = {
  title: 'BAILE DA LAGOA',
  subtitle: 'A NOITE DAS MÁSCARAS',
  date: 'SÁBADO · 31.10.2026',
  time: 'A PARTIR DAS 20H',
  address: 'Av. Gen. Motors, 1159 - Ronda',
  city: 'São José dos Campos - SP · 12221-842',
  rule: 'SEM MÁSCARA, SEM ENTRADA',
  drink: '1 DRINK INCLUSO · BAR SEM ÁLCOOL',
};

const COLORS = {
  bg: '#0B0B0D',
  card: '#141418',
  border: '#1F1F24',
  text: '#E8E8EF',
  muted: '#8C8C9A',
  dim: '#5B5B66',
  purple: '#8A3CFF',
  yellow: '#F5C400',
  red: '#FF2E3B',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.bg, padding: 24, fontFamily: 'Helvetica', color: COLORS.text },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, flexGrow: 1 },
  header: { backgroundColor: COLORS.purple, paddingVertical: 18, paddingHorizontal: 20 },
  headerKicker: { fontSize: 8, color: COLORS.bg, letterSpacing: 2, fontFamily: 'Helvetica-Bold' },
  headerTitle: { fontSize: 26, color: COLORS.bg, fontFamily: 'Helvetica-Bold', marginTop: 4, letterSpacing: -0.5 },
  headerSub: { fontSize: 9, color: COLORS.bg, marginTop: 2, letterSpacing: 1 },
  body: { paddingVertical: 18, paddingHorizontal: 20 },
  kindRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  badgePaid: { backgroundColor: COLORS.purple, color: COLORS.bg },
  badgeCourtesy: { backgroundColor: COLORS.yellow, color: COLORS.bg },
  lot: { fontSize: 8, color: COLORS.muted, letterSpacing: 1 },
  label: { fontSize: 7, color: COLORS.dim, letterSpacing: 2, marginBottom: 3 },
  name: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginBottom: 2 },
  email: { fontSize: 9, color: COLORS.muted, marginBottom: 14 },
  qrBox: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.purple,
    padding: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  qr: { width: 190, height: 190 },
  qrCaption: { fontSize: 7, color: COLORS.bg, letterSpacing: 1.5, marginTop: 6, fontFamily: 'Helvetica-Bold' },
  code: { fontSize: 24, fontFamily: 'Courier-Bold', color: COLORS.purple, textAlign: 'center', letterSpacing: 2, marginBottom: 14 },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed', marginVertical: 10 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoCol: { width: '48%' },
  infoValue: { fontSize: 9, color: COLORS.text, fontFamily: 'Helvetica-Bold' },
  infoSmall: { fontSize: 8, color: COLORS.muted, marginTop: 1 },
  rule: { fontSize: 9, color: COLORS.red, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, textAlign: 'center', marginTop: 4 },
  note: { fontSize: 8, color: COLORS.muted, textAlign: 'center', marginTop: 4 },
  footer: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  footerText: { fontSize: 7, color: COLORS.dim, letterSpacing: 1 },
});

export interface TicketPdfInput {
  name: string;
  email: string | null;
  ticketCode: string;
  kind: TicketKind;
  /** Rótulo do lote (ingresso pago) */
  lotName?: string | null;
  /** Observação da cortesia (ex.: "equipe de som") */
  note?: string | null;
}

function TicketDocument({ name, email, ticketCode, kind, lotName, note, qrDataUrl }: TicketPdfInput & { qrDataUrl: string }) {
  const isCourtesy = kind === 'courtesy';
  return (
    <Document title={`Ingresso ${ticketCode} · Baile da Lagoa`} author="Baile da Lagoa" subject={isCourtesy ? 'Ingresso cortesia' : 'Ingresso'}>
      <Page size={[420, 760]} style={styles.page}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerKicker}>{EVENT_INFO.subtitle} · 31.10 · SJC</Text>
            <Text style={styles.headerTitle}>{EVENT_INFO.title}</Text>
            <Text style={styles.headerSub}>{isCourtesy ? 'INGRESSO CORTESIA' : 'INGRESSO CONFIRMADO'}</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.kindRow}>
              <Text style={[styles.badge, isCourtesy ? styles.badgeCourtesy : styles.badgePaid]}>
                {isCourtesy ? 'CORTESIA' : 'PAGO'}
              </Text>
              <Text style={styles.lot}>{isCourtesy ? 'ACESSO LIBERADO' : (lotName ?? '').toUpperCase()}</Text>
            </View>

            <Text style={styles.label}>PARTICIPANTE</Text>
            <Text style={styles.name}>{name.toUpperCase()}</Text>
            <Text style={styles.email}>{email ?? 'Entrega via WhatsApp'}</Text>

            <View style={styles.qrBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image não aceita alt */}
              <Image src={qrDataUrl} style={styles.qr} />
              <Text style={styles.qrCaption}>QR CODE VÁLIDO PARA ENTRADA</Text>
            </View>
            <Text style={styles.code}>{ticketCode}</Text>

            <View style={styles.divider} />

            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>QUANDO</Text>
                <Text style={styles.infoValue}>{EVENT_INFO.date}</Text>
                <Text style={styles.infoSmall}>{EVENT_INFO.time}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.label}>ONDE</Text>
                <Text style={styles.infoValue}>{EVENT_INFO.address}</Text>
                <Text style={styles.infoSmall}>{EVENT_INFO.city}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.rule}>{EVENT_INFO.rule}</Text>
            <Text style={styles.note}>Qualquer máscara vale: veneziana, moderna ou avant-garde.</Text>
            <Text style={styles.note}>{EVENT_INFO.drink}</Text>
            {isCourtesy && note ? <Text style={styles.note}>Cortesia: {note}</Text> : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>INGRESSO PESSOAL E INTRANSFERÍVEL · APRESENTE NA PORTARIA</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Renderiza o PDF e devolve o Buffer (para download ou anexo de e-mail)
export async function renderTicketPdf(input: TicketPdfInput): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(input.ticketCode, {
    width: 600,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B0B0D', light: '#FFFFFF' },
  });
  const buffer = await renderToBuffer(<TicketDocument {...input} qrDataUrl={qrDataUrl} />);
  return Buffer.from(buffer);
}

export function ticketPdfFilename(ticketCode: string) {
  return `ingresso-baile-da-lagoa-${ticketCode}.pdf`;
}

export interface TicketPdfAttachment {
  filename: string;
  content: Buffer;
}

// Versão "segura" para anexar em e-mail: nunca lança; se falhar, loga e devolve null
export async function buildTicketPdfAttachment(input: TicketPdfInput, leadId?: string | null): Promise<TicketPdfAttachment | null> {
  try {
    return { filename: ticketPdfFilename(input.ticketCode), content: await renderTicketPdf(input) };
  } catch (err) {
    console.error(`[PDF] Falha ao gerar ingresso ${input.ticketCode}:`, err);
    await logNotification({
      level: 'warn',
      kind: 'ticket',
      message: `PDF do ingresso ${input.ticketCode} não pôde ser gerado; e-mail segue sem o anexo.`,
      leadId,
      email: input.email,
      errorCode: 'pdf_generation_failed',
    });
    return null;
  }
}

// Rótulo do lote em que o ingresso foi efetivamente pago (pedido 'paid'); padrão se não houver
export async function getPaidLotName(leadId: string): Promise<string> {
  try {
    const { data } = await createAdminClient()
      .from('payment_orders')
      .select('ticket_lots(sort_order)')
      .eq('lead_id', leadId)
      .eq('status', 'paid')
      .maybeSingle<{ ticket_lots: { sort_order: number } | null }>();
    return data?.ticket_lots ? lotLabels(data.ticket_lots.sort_order).name : DEFAULT_LOT.name;
  } catch {
    return DEFAULT_LOT.name;
  }
}
