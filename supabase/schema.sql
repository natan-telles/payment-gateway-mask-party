-- ==============================================================================
-- MASK PARTY // SUPABASE DATABASE SCHEMA
-- Fila de Espera Imutável, Pagamento PIX e Emissão de Ingressos
-- ==============================================================================

-- 1. TABELA PRINCIPAL: waiting_queue
CREATE TABLE IF NOT EXISTS public.waiting_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    queue_position BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    
    -- Dados do Lead (Obrigatórios)
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Dados Opcionais / Demográficos
    age INTEGER,
    neighborhood TEXT,
    instagram TEXT,
    source TEXT DEFAULT 'direct' NOT NULL,
    
    -- Controle de Fila e Notificações
    notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
    notification_date TIMESTAMP WITH TIME ZONE,
    
    -- Controle de Pagamento
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'expired', 'refunded', 'failed')),
    payment_date TIMESTAMP WITH TIME ZONE,
    pix_txid TEXT,
    
    -- Emissão de Ingresso e Check-in
    ticket_status TEXT DEFAULT 'none' CHECK (ticket_status IN ('none', 'issued', 'checked_in', 'cancelled')),
    ticket_code TEXT UNIQUE,
    checkin_status BOOLEAN DEFAULT false NOT NULL,
    checkin_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,

    -- Restrições para Prevenção de Duplicidade (Requisito Fundamental do Debrief)
    CONSTRAINT uq_waiting_queue_phone UNIQUE (phone),
    CONSTRAINT uq_waiting_queue_email UNIQUE (email)
);

-- 2. ÍNDICES DE PERFORMANCE E CONSULTAS
CREATE INDEX IF NOT EXISTS idx_waiting_queue_position ON public.waiting_queue (queue_position ASC);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_phone ON public.waiting_queue (phone);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_email ON public.waiting_queue (email);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_ticket_code ON public.waiting_queue (ticket_code);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_payment_status ON public.waiting_queue (payment_status);

-- Check-in atômico: a linha do ingresso fica bloqueada enquanto é validada.
-- Isso impede que duas portarias aprovem o mesmo QR Code ao mesmo tempo.
CREATE OR REPLACE FUNCTION public.check_in_ticket(p_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lead RECORD;
    v_code TEXT;
BEGIN
    v_code := upper(trim(p_ticket_code));

    IF v_code IS NULL OR v_code = '' THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid', 'error', 'Código do ingresso é obrigatório.');
    END IF;

    SELECT id, name, ticket_code, payment_status, ticket_status, checkin_status, checkin_at
    INTO v_lead
    FROM public.waiting_queue
    WHERE ticket_code = v_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_found', 'error', 'Ingresso não encontrado.');
    END IF;

    IF v_lead.payment_status <> 'approved' OR v_lead.ticket_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_eligible', 'error', 'Este ingresso não está autorizado para entrada.');
    END IF;

    IF v_lead.checkin_status OR v_lead.ticket_status = 'checked_in' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'already_checked_in',
            'error', 'Este ingresso já foi utilizado.',
            'name', v_lead.name,
            'ticket_code', v_lead.ticket_code,
            'checkin_at', v_lead.checkin_at
        );
    END IF;

    UPDATE public.waiting_queue
    SET checkin_status = true,
        checkin_at = now(),
        ticket_status = 'checked_in'
    WHERE id = v_lead.id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'checked_in',
        'name', v_lead.name,
        'ticket_code', v_lead.ticket_code,
        'checkin_at', now()
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_in_ticket(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(TEXT) TO service_role;

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.waiting_queue ENABLE ROW LEVEL SECURITY;

-- Sem políticas: leitura, cadastro e atualização passam exclusivamente pelo backend
-- (Service Role ignora RLS). Políticas públicas expunham ticket_code de todos os leads
-- e permitiam inserir linhas já com payment_status = 'approved'.
DROP POLICY IF EXISTS "Permitir leitura anonima da propria posicao" ON public.waiting_queue;
DROP POLICY IF EXISTS "Permitir cadastro na fila" ON public.waiting_queue;

-- 4. FUNÇÃO ATÔMICA PARA REGISTRO NA FILA (IDEMPOTENTE E ANTI-FRAUDE)
CREATE OR REPLACE FUNCTION public.register_queue_lead(
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_age INTEGER DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_instagram TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'direct'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_existing RECORD;
    v_new RECORD;
BEGIN
    -- Normalização de dados
    v_clean_phone := regexp_replace(p_phone, '[^\d]', '', 'g');
    v_clean_email := lower(trim(p_email));

    -- Verificar se já existe cadastro por telefone ou e-mail
    SELECT id, queue_position, name, phone, email, created_at
    INTO v_existing
    FROM public.waiting_queue
    WHERE phone = v_clean_phone OR email = v_clean_email
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_registered', true,
            'id', v_existing.id,
            'queue_position', v_existing.queue_position,
            'name', v_existing.name,
            'phone', v_existing.phone,
            'email', v_existing.email,
            'created_at', v_existing.created_at
        );
    END IF;

    -- Inserção segura gerando posição de fila sequencial imutável
    INSERT INTO public.waiting_queue (
        name,
        phone,
        email,
        age,
        neighborhood,
        instagram,
        source
    ) VALUES (
        trim(p_name),
        v_clean_phone,
        v_clean_email,
        p_age,
        trim(p_neighborhood),
        trim(p_instagram),
        coalesce(trim(p_source), 'direct')
    )
    RETURNING id, queue_position, name, phone, email, created_at
    INTO v_new;

    RETURN jsonb_build_object(
        'success', true,
        'already_registered', false,
        'id', v_new.id,
        'queue_position', v_new.queue_position,
        'name', v_new.name,
        'phone', v_new.phone,
        'email', v_new.email,
        'created_at', v_new.created_at
    );
END;
$$;

-- Cadastro só via /api/queue (Service Role)
REVOKE EXECUTE ON FUNCTION public.register_queue_lead(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_queue_lead(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- ==============================================================================
-- 5. PAGAMENTO: LOTES, RESERVAS E CONFIRMAÇÃO
-- Regra de lote: um lote fecha quando esgota OU quando passa de ends_at
-- (o que acontecer primeiro), e o próximo lote (sort_order) abre em seguida.
-- Cada checkout reserva uma vaga por 30 minutos; sem pagamento, a vaga volta.
-- ==============================================================================

-- Prazo para o lead pagar após ser liberado pelo release-batch
ALTER TABLE public.waiting_queue ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.ticket_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    capacity INTEGER NOT NULL CHECK (capacity >= 0),
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- enviado ao gateway como order_nsu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.waiting_queue(id),
    lot_id UUID NOT NULL REFERENCES public.ticket_lots(id),
    amount_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'reserved' NOT NULL CHECK (status IN ('reserved', 'paid', 'expired', 'cancelled', 'duplicate')),
    reserved_until TIMESTAMP WITH TIME ZONE NOT NULL,
    provider TEXT NOT NULL,
    checkout_url TEXT,
    provider_ref TEXT,          -- InfinitePay: invoice slug
    transaction_id TEXT UNIQUE, -- InfinitePay: transaction_nsu
    paid_amount_cents INTEGER,
    capture_method TEXT,
    receipt_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Pix copia-e-cola (gateways com Pix direto no site, ex: Mercado Pago)
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS pix_code TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_lot_status ON public.payment_orders (lot_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_lead ON public.payment_orders (lead_id);
-- Um lead só pode ter um pedido pago
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_lead_paid ON public.payment_orders (lead_id) WHERE status = 'paid';

-- Sem políticas: acesso exclusivo do backend (Service Role)
ALTER TABLE public.ticket_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Lote vigente: primeiro lote ativo, dentro da janela de datas e com vaga
-- (vagas ocupadas = pedidos pagos + reservas ainda válidas)
CREATE OR REPLACE FUNCTION public.current_ticket_lot()
RETURNS SETOF public.ticket_lots
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT l.*
    FROM public.ticket_lots l
    WHERE l.is_active
      AND (l.starts_at IS NULL OR l.starts_at <= now())
      AND (l.ends_at IS NULL OR l.ends_at > now())
      AND l.capacity > (
          SELECT count(*)
          FROM public.payment_orders o
          WHERE o.lot_id = l.id
            AND (o.status = 'paid' OR (o.status = 'reserved' AND o.reserved_until > now()))
      )
    ORDER BY l.sort_order ASC
    LIMIT 1;
$$;

-- Reserva atômica de uma vaga no lote vigente (idempotente por lead)
CREATE OR REPLACE FUNCTION public.reserve_ticket(
    p_lead_id UUID,
    p_provider TEXT,
    p_reservation_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead RECORD;
    v_order RECORD;
    v_lot RECORD;
BEGIN
    -- Serializa as reservas para nunca vender acima da capacidade do lote
    PERFORM pg_advisory_xact_lock(hashtext('reserve_ticket'));

    SELECT id, payment_status, notification_status, payment_deadline, ticket_code
    INTO v_lead
    FROM public.waiting_queue
    WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'lead_not_found');
    END IF;

    IF v_lead.payment_status = 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_paid', 'ticket_code', v_lead.ticket_code);
    END IF;

    IF v_lead.notification_status <> 'sent' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_released');
    END IF;

    IF v_lead.payment_deadline IS NOT NULL AND v_lead.payment_deadline <= now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'deadline_passed');
    END IF;

    -- Libera reservas vencidas
    UPDATE public.payment_orders
    SET status = 'expired'
    WHERE status = 'reserved' AND reserved_until <= now();

    -- Reaproveita a reserva válida do lead, se houver
    SELECT o.id, o.amount_cents, o.reserved_until, o.checkout_url, o.pix_code, o.provider_ref, l.name AS lot_name
    INTO v_order
    FROM public.payment_orders o
    JOIN public.ticket_lots l ON l.id = o.lot_id
    WHERE o.lead_id = p_lead_id AND o.status = 'reserved'
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'reused', true,
            'order_id', v_order.id,
            'lot_name', v_order.lot_name,
            'amount_cents', v_order.amount_cents,
            'reserved_until', v_order.reserved_until,
            'checkout_url', v_order.checkout_url,
            'pix_code', v_order.pix_code,
            'provider_ref', v_order.provider_ref
        );
    END IF;

    SELECT * INTO v_lot FROM public.current_ticket_lot();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'sold_out');
    END IF;

    INSERT INTO public.payment_orders (lead_id, lot_id, amount_cents, reserved_until, provider)
    VALUES (p_lead_id, v_lot.id, v_lot.price_cents, now() + make_interval(mins => p_reservation_minutes), p_provider)
    RETURNING id, amount_cents, reserved_until INTO v_order;

    RETURN jsonb_build_object(
        'success', true,
        'reused', false,
        'order_id', v_order.id,
        'lot_name', v_lot.name,
        'amount_cents', v_order.amount_cents,
        'reserved_until', v_order.reserved_until,
        'checkout_url', null,
        'pix_code', null,
        'provider_ref', null
    );
END;
$$;

-- Confirmação atômica e idempotente do pagamento + emissão do ingresso.
-- Só deve ser chamada depois que o backend verificou o pagamento no gateway.
CREATE OR REPLACE FUNCTION public.confirm_payment(
    p_order_id UUID,
    p_transaction_id TEXT,
    p_paid_amount_cents INTEGER,
    p_capture_method TEXT DEFAULT NULL,
    p_receipt_url TEXT DEFAULT NULL,
    p_provider_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_lead RECORD;
    v_lot_name TEXT;
    v_ticket TEXT;
BEGIN
    SELECT * INTO v_order FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
    END IF;

    SELECT id, name, email, ticket_code, payment_status
    INTO v_lead
    FROM public.waiting_queue
    WHERE id = v_order.lead_id
    FOR UPDATE;

    -- Notificação repetida do mesmo pagamento
    IF v_order.status IN ('paid', 'duplicate') THEN
        RETURN jsonb_build_object(
            'success', true,
            'newly_paid', false,
            'duplicate', v_order.status = 'duplicate',
            'ticket_code', v_lead.ticket_code
        );
    END IF;

    -- Lead já pagou por outro pedido: registra para estorno manual
    IF v_lead.payment_status = 'approved' THEN
        UPDATE public.payment_orders
        SET status = 'duplicate',
            transaction_id = p_transaction_id,
            paid_amount_cents = p_paid_amount_cents,
            capture_method = p_capture_method,
            receipt_url = p_receipt_url,
            provider_ref = coalesce(p_provider_ref, provider_ref),
            paid_at = now()
        WHERE id = v_order.id;

        RETURN jsonb_build_object('success', true, 'newly_paid', false, 'duplicate', true, 'ticket_code', v_lead.ticket_code);
    END IF;

    -- Pagamento aceito mesmo se a reserva expirou: o dinheiro já entrou
    UPDATE public.payment_orders
    SET status = 'cancelled'
    WHERE lead_id = v_order.lead_id AND id <> v_order.id AND status = 'reserved';

    UPDATE public.payment_orders
    SET status = 'paid',
        transaction_id = p_transaction_id,
        paid_amount_cents = p_paid_amount_cents,
        capture_method = p_capture_method,
        receipt_url = p_receipt_url,
        provider_ref = coalesce(p_provider_ref, provider_ref),
        paid_at = now()
    WHERE id = v_order.id;

    v_ticket := 'BDL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    UPDATE public.waiting_queue
    SET payment_status = 'approved',
        payment_date = now(),
        pix_txid = p_transaction_id,
        ticket_status = 'issued',
        ticket_code = v_ticket
    WHERE id = v_lead.id;

    SELECT name INTO v_lot_name FROM public.ticket_lots WHERE id = v_order.lot_id;

    RETURN jsonb_build_object(
        'success', true,
        'newly_paid', true,
        'duplicate', false,
        'ticket_code', v_ticket,
        'lead_name', v_lead.name,
        'lead_email', v_lead.email,
        'lot_name', v_lot_name,
        'receipt_url', p_receipt_url
    );
END;
$$;

-- Funções de pagamento: somente o backend (Service Role) pode executar
REVOKE EXECUTE ON FUNCTION public.current_ticket_lot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_ticket(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_ticket_lot() TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ticket(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_payment(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- Exemplo de cadastro de lotes (ajuste preços, quantidades e datas):
-- INSERT INTO public.ticket_lots (name, sort_order, price_cents, capacity, ends_at) VALUES
--   ('1º LOTE', 1, 5000, 200, '2026-10-20 23:59:59-03'),
--   ('2º LOTE', 2, 7000, 300, '2026-10-27 23:59:59-03'),
--   ('3º LOTE', 3, 9000, 200, NULL);
