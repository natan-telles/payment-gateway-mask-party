import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Senha de administrador incorreta.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, message: 'Autenticado com sucesso.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro na autenticação' },
      { status: 500 }
    );
  }
}
