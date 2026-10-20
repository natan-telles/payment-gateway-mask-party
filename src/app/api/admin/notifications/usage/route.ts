import { NextRequest, NextResponse } from 'next/server';
import { getResendUsage, emailsRemaining, describeUsage } from '@/lib/notifications/usage';

function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  return authHeader === expected;
}

// Uso atual da cota do Resend, para o painel consultar antes de disparar e-mails
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  const usage = await getResendUsage();

  return NextResponse.json({
    success: true,
    usage,
    remaining: emailsRemaining(usage),
    summary: describeUsage(usage),
  });
}
