import type { TicketKind } from '@/types/database';

// Rótulos e cores dos tipos de ingresso (admin, portaria, PDF, e-mail)
export const TICKET_KINDS: Record<TicketKind, { label: string; short: string; color: string; textOnColor: string; prefix: string }> = {
  paid: { label: 'Ingresso pago', short: 'PAGO', color: '#8A3CFF', textOnColor: '#0B0B0D', prefix: 'BDL-' },
  courtesy: { label: 'Ingresso cortesia', short: 'CORTESIA', color: '#F5C400', textOnColor: '#0B0B0D', prefix: 'BDL-C-' },
  volunteer: { label: 'Ingresso de voluntário', short: 'VOLUNTÁRIO', color: '#2DD4BF', textOnColor: '#0B0B0D', prefix: 'BDL-V-' },
};

/** Tipos que o admin emite sem pagamento */
export const STAFF_KINDS: TicketKind[] = ['courtesy', 'volunteer'];

export function isStaffKind(kind: string | null | undefined): kind is 'courtesy' | 'volunteer' {
  return kind === 'courtesy' || kind === 'volunteer';
}
