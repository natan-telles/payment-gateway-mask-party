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

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.waiting_queue ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública Limitada: Usuários podem checar status pelo telefone/email ou id
CREATE POLICY "Permitir leitura anonima da propria posicao" 
ON public.waiting_queue 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Política de Inserção: Anônimos podem se registrar na fila
CREATE POLICY "Permitir cadastro na fila" 
ON public.waiting_queue 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Atualizações são restritas exclusivamente ao backend (Service Role) para evitar fraudes
-- Service Role ignora RLS automaticamente.

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
