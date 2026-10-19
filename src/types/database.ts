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
  payment_deadline: string | null;
}

export type PaymentOrderStatus = 'reserved' | 'paid' | 'expired' | 'cancelled' | 'duplicate';

export interface TicketLot {
  id: string;
  created_at: string;
  name: string;
  sort_order: number;
  price_cents: number;
  capacity: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface PaymentOrder {
  id: string;
  created_at: string;
  lead_id: string;
  lot_id: string;
  amount_cents: number;
  status: PaymentOrderStatus;
  reserved_until: string;
  provider: string;
  checkout_url: string | null;
  pix_code: string | null;
  provider_ref: string | null;
  transaction_id: string | null;
  paid_amount_cents: number | null;
  capture_method: string | null;
  receipt_url: string | null;
  paid_at: string | null;
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
    payment_status?: PaymentStatus;
    ticket_code?: string | null;
  };
  error?: string;
}
