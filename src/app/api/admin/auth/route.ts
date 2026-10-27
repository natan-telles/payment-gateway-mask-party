import { NextRequest, NextResponse } from 'next/server';
import { resolveRole } from '@/lib/admin-auth';

// Valida a senha e informa o papel: 'admin' (tudo) ou 'checkin' (só portaria)
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const role = resolveRole(typeof password === 'string' ? password : null);

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Senha incorreta.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, role, message: 'Autenticado com sucesso.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro na autenticação';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
