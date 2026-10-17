import { NextRequest, NextResponse, after } from 'next/server';
import { getPaymentProvider, isSupabaseConfigured } from '@/lib/payments';
import { confirmOrderPayment, notifyTicketIssued } from '@/lib/payments/service';

// Chamado pela página /pagamento/retorno com os parâmetros que o gateway anexou à redirect_url.
// Garante a emissão do ingresso mesmo se o webhook atrasar ou falhar.
export async function POST(req: NextRequest) {
  try {
    const { query } = (await req.json()) as { query?: string };

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Supabase não está configurado.' }, { status: 500 });
    }

    const provider = getPaymentProvider();
    const ref = provider.parseReturnParams(new URLSearchParams(query || ''));

    if (!ref) {
      return NextResponse.json({ success: false, error: 'Dados de pagamento ausentes.' }, { status: 400 });
    }

    const result = await confirmOrderPayment(ref, provider);
    after(() => notifyTicketIssued(result));

    return NextResponse.json({
      success: true,
      data: { status: result.status, ticketCode: result.ticketCode ?? null },
    });
  } catch (err) {
    console.error('Checkout Confirm Error:', err);
    return NextResponse.json({ success: false, error: 'Erro ao verificar pagamento.' }, { status: 500 });
  }
}
