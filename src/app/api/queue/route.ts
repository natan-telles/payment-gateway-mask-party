import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendQueueConfirmationEmail } from '@/lib/notifications/email';
import { getCurrentLotLabels } from '@/lib/lots/server';
import { DEFAULT_LOT } from '@/lib/lots/labels';

// O e-mail de confirmação cita o lote vigente; se o banco falhar, segue com o padrão
const currentLotName = () => getCurrentLotLabels().then((lot) => lot.name, () => DEFAULT_LOT.name);
import { JoinQueueInput, PaymentStatus, QueueResponse } from '@/types/database';

// Cache / fallback em memória para testes locais quando o Supabase ainda não estiver configurado no .env
let mockCounter = 42;
const mockStore = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JoinQueueInput;
    const { name, phone, email, age, neighborhood, instagram, source } = body;

    if (!name || !phone || !email) {
      return NextResponse.json<QueueResponse>(
        { success: false, error: 'Nome, Telefone e E-mail são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // 1. Tentar persistência no Supabase
    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref');

    if (hasSupabase) {
      const supabase = createAdminClient();

      // Chamada da função atômica segura register_queue_lead
      const { data, error } = await supabase.rpc('register_queue_lead', {
        p_name: name,
        p_phone: cleanPhone,
        p_email: cleanEmail,
        p_age: age ? Number(age) : null,
        p_neighborhood: neighborhood?.trim() || null,
        p_instagram: instagram?.trim() || null,
        p_source: source?.trim() || 'direct',
      });

      if (error) {
        // Se a função RPC não estiver criada, fazemos fallback para insert/select direto
        console.warn('RPC register_queue_lead error, fallback para query direta:', error.message);
        
        // Verifica duplicidade
        const { data: existing } = await supabase
          .from('waiting_queue')
          .select('id, queue_position, name, phone, email, created_at, payment_status')
          .or(`phone.eq.${cleanPhone},email.eq.${cleanEmail}`)
          .maybeSingle();

        if (existing) {
          return NextResponse.json<QueueResponse>({
            success: true,
            data: {
              ...existing,
              already_registered: true,
            },
          });
        }

        const { data: inserted, error: insertError } = await supabase
          .from('waiting_queue')
          .insert({
            name: name.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            age: age ? Number(age) : null,
            neighborhood: neighborhood?.trim() || null,
            instagram: instagram?.trim() || null,
            source: source?.trim() || 'direct',
          })
          .select('id, queue_position, name, phone, email, created_at')
          .single();

        if (insertError) {
          return NextResponse.json<QueueResponse>(
            { success: false, error: insertError.message },
            { status: 500 }
          );
        }

        if (!existing) {
          currentLotName().then((lotName) => sendQueueConfirmationEmail({
            lotName,
            to: cleanEmail,
            name: name.trim(),
            queuePosition: Number(inserted.queue_position),
          })).catch((e) => console.error('Erro ao enviar e-mail de confirmação:', e));
        }

        return NextResponse.json<QueueResponse>({
          success: true,
          data: {
            ...inserted,
            already_registered: false,
          },
        });
      }

      const rpcResult = data as any;
      const isAlreadyRegistered = Boolean(rpcResult.already_registered);

      // Quem já estava na fila pode ter pago: a tela mostra o ingresso pago nesse caso
      let paymentStatus: PaymentStatus | undefined;
      if (isAlreadyRegistered) {
        const { data: lead } = await supabase
          .from('waiting_queue')
          .select('payment_status')
          .eq('id', rpcResult.id)
          .maybeSingle();
        paymentStatus = lead?.payment_status ?? undefined;
      }

      if (!isAlreadyRegistered) {
        currentLotName().then((lotName) => sendQueueConfirmationEmail({
          lotName,
          to: rpcResult.email,
          name: rpcResult.name,
          queuePosition: Number(rpcResult.queue_position),
        })).catch((e) => console.error('Erro ao enviar e-mail de confirmação:', e));
      }

      return NextResponse.json<QueueResponse>({
        success: true,
        data: {
          id: rpcResult.id,
          name: rpcResult.name,
          phone: rpcResult.phone,
          email: rpcResult.email,
          queue_position: Number(rpcResult.queue_position),
          created_at: rpcResult.created_at,
          already_registered: isAlreadyRegistered,
          payment_status: paymentStatus,
        },
      });
    }

    // 2. Fallback de Desenvolvimento Local (quando Supabase ainda não foi conectado)
    const existingKey = Array.from(mockStore.values()).find(
      (item) => item.phone === cleanPhone || item.email === cleanEmail
    );

    if (existingKey) {
      return NextResponse.json<QueueResponse>({
        success: true,
        data: {
          ...existingKey,
          already_registered: true,
        },
      });
    }

    mockCounter += 1;
    const newEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      queue_position: mockCounter,
      created_at: new Date().toISOString(),
      already_registered: false,
    };

    mockStore.set(newEntry.id, newEntry);

    currentLotName().then((lotName) => sendQueueConfirmationEmail({
      lotName,
      to: newEntry.email,
      name: newEntry.name,
      queuePosition: newEntry.queue_position,
    })).catch((e) => console.error('Erro ao enviar e-mail de confirmação:', e));

    return NextResponse.json<QueueResponse>({
      success: true,
      data: newEntry,
    });
  } catch (err: any) {
    console.error('Queue API Error:', err);
    return NextResponse.json<QueueResponse>(
      { success: false, error: err.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro de busca não fornecido' },
        { status: 400 }
      );
    }

    // E-mail com números (ex.: joao12@...) não pode virar só dígitos
    const cleanQuery = query.includes('@')
      ? query.trim().toLowerCase()
      : query.replace(/\D/g, '');

    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref');

    if (hasSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('waiting_queue')
        .select('id, queue_position, name, phone, email, created_at, payment_status, ticket_status')
        .or(`phone.eq.${cleanQuery},email.eq.${cleanQuery}`)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ success: false, error: 'Cadastro não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data });
    }

    // Mock search
    const found = Array.from(mockStore.values()).find(
      (item) => item.phone === cleanQuery || item.email.toLowerCase() === cleanQuery
    );

    if (!found) {
      return NextResponse.json({ success: false, error: 'Cadastro não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: found });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao buscar cadastro' },
      { status: 500 }
    );
  }
}
