export type QueueStatus = 'waiting' | 'notified' | 'expired' | 'purchased' | 'cancelled';
export type PaymentStatus = 'pending' | 'approved' | 'expired' | 'refunded' | 'failed';
export type TicketStatus = 'none' | 'issued' | 'checked_in' | 'cancelled';

export interface WaitingQueueEntry {
  id: string;
  created_at: string;
  queue_position: number;
  name: string;
  phone: string;
  email: string;
  age: number | null;
  neighborhood: string | null;
  instagram: string | null;
  source: string;
  notification_status: 'pending' | 'sent' | 'failed';
  notification_date: string | null;
  payment_status: PaymentStatus;
  payment_date: string | null;
  pix_txid: string | null;
  ticket_status: TicketStatus;
  ticket_code: string | null;
  checkin_status: boolean;
  checkin_at: string | null;
  notes: string | null;
}

export interface JoinQueueInput {
  name: string;
  phone: string;
  email: string;
  age?: number | null;
  neighborhood?: string | null;
  instagram?: string | null;
  source?: string;
}

export interface QueueResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    queue_position: number;
    created_at: string;
    already_registered?: boolean;
  };
  error?: string;
}
