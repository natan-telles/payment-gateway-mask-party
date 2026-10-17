import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');

  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Baile da Lagoa <onboarding@resend.dev>';

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'RESEND_API_KEY não está definida nas variáveis de ambiente da Vercel / .env',
      config: {
        hasApiKey: false,
        emailFrom,
      },
    });
  }

  if (!to) {
    return NextResponse.json({
      success: false,
      message: 'Informe o parâmetro ?to=seu_email@dominio.com na URL para testar o envio',
      config: {
        hasApiKey: true,
        apiKeyPrefix: apiKey.slice(0, 6) + '...',
        emailFrom,
      },
    });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to,
      subject: '🧪 Teste de Conexão · Baile da Lagoa / Resend',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0B0B0D; color: #E8E8EF;">
          <h2 style="color: #8A3CFF;">Teste de Conexão Bem-Sucedido!</h2>
          <p>O Resend está configurado e enviando e-mails com sucesso para o Baile da Lagoa.</p>
          <p>Remetente: <strong>${emailFrom}</strong></p>
          <p>Destinatário: <strong>${to}</strong></p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        config: {
          emailFrom,
          to,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `E-mail de teste enviado com sucesso para ${to}!`,
      resendId: data?.id,
      config: {
        emailFrom,
        to,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}
