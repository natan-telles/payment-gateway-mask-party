import { NextResponse, connection } from 'next/server';
import { getCurrentLotLabels } from '@/lib/lots/server';
import { LotLabels } from '@/lib/lots/labels';

export interface CurrentLotResponse {
  success: boolean;
  data?: LotLabels;
  error?: string;
}

// Rota pública: só expõe o rótulo do lote vigente (sem preço, capacidade ou vendas)
export async function GET() {
  // Sempre em tempo de requisição: o lote muda quando esgota ou vence
  await connection();

  try {
    return NextResponse.json<CurrentLotResponse>({ success: true, data: await getCurrentLotLabels() });
  } catch (err) {
    return NextResponse.json<CurrentLotResponse>(
      { success: false, error: err instanceof Error ? err.message : 'Erro ao carregar lote' },
      { status: 500 }
    );
  }
}
