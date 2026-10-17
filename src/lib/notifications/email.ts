import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || 'Baile da Lagoa <ingressos@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailPayload {
  to: string;
  name: string;
  queuePosition: number;
  paymentUrl?: string;
  expirationHours?: number;
}

// Template HTML Oficial Baile da Lagoa
function getReleaseEmailHtml({
  name,
  queuePosition,
  paymentUrl,
  expirationHours = 12,
}: {
  name: string;
  queuePosition: number;
  paymentUrl: string;
  expirationHours?: number;
}) {
  const formattedPos = String(queuePosition).padStart(4, '0');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Acesso Liberado · Baile da Lagoa 31.10</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #141418; border: 1px solid #1F1F24;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px; background-color: #8A3CFF; color: #0B0B0D;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                      A NOITE DAS MÁSCARAS · 31.10 · SJC
                    </div>
                    <div style="font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-top: 4px;">
                      BAILE DA LAGOA
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: #0B0B0D; color: #E8E8EF; font-size: 10px; font-weight: 700; padding: 4px 8px; text-transform: uppercase; font-family: monospace;">
                      1º LOTE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 13px; color: #5B5B66; text-transform: uppercase; margin: 0 0 16px 0; font-family: monospace;">
                Olá, <strong style="color: #E8E8EF;">${name.toUpperCase()}</strong>
              </p>

              <h2 style="font-size: 22px; font-weight: 900; color: #E8E8EF; text-transform: uppercase; margin: 0 0 20px 0; line-height: 1.2;">
                SEU LUGAR NO 1º LOTE ESTÁ LIBERADO.
              </h2>

              <!-- Posição da Lista -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 24px; text-align: center;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #5B5B66; letter-spacing: 2px; display: block;">
                      SEU NÚMERO NA PRÉ-VENDA
                    </span>
                    <div style="font-size: 52px; font-weight: 900; color: #8A3CFF; line-height: 1; margin: 8px 0;">
                      #${formattedPos}
                    </div>
                    <span style="font-size: 10px; color: #5B5B66; text-transform: uppercase; font-family: monospace;">
                      PRIORIDADE ATIVA
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Regra de Pagamento & Expiração -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border-left: 3px solid #8A3CFF; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #E8E8EF; text-transform: uppercase; margin-bottom: 4px;">
                      PRAZO DE PAGAMENTO VIA PIX: ${expirationHours} HORAS
                    </div>
                    <div style="font-size: 11px; color: #5B5B66; line-height: 1.5; font-family: monospace;">
                      O link possui prazo de validade. Caso não complete o pagamento dentro do prazo, a vaga passa para o próximo da lista.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA Vermelho Sinal -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: block; background-color: #FF2E3B; color: #ffffff; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; padding: 16px 24px; text-align: center; letter-spacing: 1px;">
                      PAGAR VIA PIX E GARANTIR INGRESSO &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Regra do Evento -->
              <div style="border-top: 1px solid #1F1F24; padding-top: 20px; font-size: 11px; color: #5B5B66; line-height: 1.6; font-family: monospace;">
                <strong style="color: #E8E8EF; text-transform: uppercase;">A Regra:</strong><br>
                &bull; Sem máscara, sem entrada.<br>
                &bull; Qualquer máscara vale: veneziana, moderna ou avant-garde.<br>
                &bull; Paleta recomendada: All Black.<br>
                &bull; Local exato em SJC revelado após confirmação do ingresso.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 14px 24px; background-color: #0B0B0D; border-top: 1px solid #1F1F24; text-align: center; font-size: 9px; color: #5B5B66; font-family: monospace; text-transform: uppercase;">
              BAILE DA LAGOA · 31.10 · SJC · UMA FESTA. UMA REGRA.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Template HTML de Lembrete Baile da Lagoa
function getReminderEmailHtml({
  name,
  queuePosition,
  paymentUrl,
}: {
  name: string;
  queuePosition: number;
  paymentUrl: string;
}) {
  const formattedPos = String(queuePosition).padStart(4, '0');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Último Aviso · Baile da Lagoa</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #141418; border: 1px solid #1F1F24;">
          <tr>
            <td style="padding: 24px; background-color: #0B0B0D; border-bottom: 2px solid #FF2E3B;">
              <span style="background-color: #FF2E3B; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 6px; text-transform: uppercase; font-family: monospace;">
                ÚLTIMO AVISO
              </span>
              <div style="font-size: 24px; font-weight: 900; color: #E8E8EF; text-transform: uppercase; margin-top: 8px;">
                SEU LUGAR NO 1º LOTE VAI EXPIRAR
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <p style="font-size: 12px; color: #5B5B66; font-family: monospace; line-height: 1.6; margin: 0 0 20px 0;">
                Olá, ${name}. O prazo para pagamento do seu ingresso no 1º Lote do <strong>Baile da Lagoa</strong> (Posição #${formattedPos}) está nas últimas horas. Caso o PIX não seja confirmado, a vaga passa para o próximo da lista.
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: block; background-color: #FF2E3B; color: #ffffff; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; padding: 16px 24px; text-align: center; letter-spacing: 1px;">
                      CONCLUIR PAGAMENTO VIA PIX &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Envio de E-mail de Liberação do Lote
export async function sendQueueReleaseEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
  expirationHours = 12,
}: EmailPayload) {
  const subject = `🎭 Seu lugar no 1º Lote está liberado · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getReleaseEmailHtml({ name, queuePosition, paymentUrl, expirationHours });

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
      });

      return { success: true, id: response.data?.id, simulated: false };
    } catch (err: any) {
      console.error(`Erro ao enviar e-mail via Resend para ${to}:`, err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] Liberação de Lote 1`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log(`Posição: #${queuePosition}`);
  console.log(`Link: ${paymentUrl}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}

// Envio de Lembrete
export async function sendReminderEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
}: EmailPayload) {
  const subject = `⚠️ Último aviso: Seu ingresso no Baile da Lagoa expira em breve (Posição #${queuePosition})`;
  const html = getReminderEmailHtml({ name, queuePosition, paymentUrl });

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
      });

      return { success: true, id: response.data?.id, simulated: false };
    } catch (err: any) {
      console.error(`Erro ao enviar lembrete para ${to}:`, err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] Lembrete`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}

interface TicketEmailPayload {
  to: string;
  name: string;
  ticketCode: string;
  lotName: string;
  receiptUrl?: string | null;
}

// Template HTML de Ingresso Confirmado Baile da Lagoa
function getTicketEmailHtml({ name, ticketCode, lotName, receiptUrl }: Omit<TicketEmailPayload, 'to'>) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ingresso Confirmado · Baile da Lagoa</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #141418; border: 1px solid #1F1F24;">
          <tr>
            <td style="padding: 24px; background-color: #8A3CFF; color: #0B0B0D;">
              <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                A NOITE DAS MÁSCARAS · 31.10 · SJC
              </div>
              <div style="font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-top: 4px;">
                INGRESSO CONFIRMADO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 13px; color: #5B5B66; text-transform: uppercase; margin: 0 0 16px 0; font-family: monospace;">
                Olá, <strong style="color: #E8E8EF;">${name.toUpperCase()}</strong>
              </p>
              <p style="font-size: 12px; color: #5B5B66; font-family: monospace; line-height: 1.6; margin: 0 0 20px 0;">
                Seu pagamento foi confirmado. Apresente o código abaixo na entrada do <strong style="color: #E8E8EF;">Baile da Lagoa</strong>.
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 24px; text-align: center;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #5B5B66; letter-spacing: 2px; display: block;">
                      CÓDIGO DO INGRESSO · ${lotName}
                    </span>
                    <div style="font-size: 36px; font-weight: 900; color: #8A3CFF; line-height: 1; margin: 10px 0; font-family: monospace;">
                      ${ticketCode}
                    </div>
                  </td>
                </tr>
              </table>

              ${
                receiptUrl
                  ? `<p style="font-size: 11px; font-family: monospace; margin: 0 0 24px 0;"><a href="${receiptUrl}" style="color: #8A3CFF;">Ver comprovante de pagamento &rarr;</a></p>`
                  : ''
              }

              <div style="border-top: 1px solid #1F1F24; padding-top: 20px; font-size: 11px; color: #5B5B66; line-height: 1.6; font-family: monospace;">
                <strong style="color: #E8E8EF; text-transform: uppercase;">A Regra:</strong><br>
                &bull; Sem máscara, sem entrada.<br>
                &bull; Ingresso pessoal e intransferível.<br>
                &bull; Local exato em SJC será enviado próximo ao evento.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 24px; background-color: #0B0B0D; border-top: 1px solid #1F1F24; text-align: center; font-size: 9px; color: #5B5B66; font-family: monospace; text-transform: uppercase;">
              BAILE DA LAGOA · 31.10 · SJC · UMA FESTA. UMA REGRA.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Envio do Ingresso após confirmação do pagamento
export async function sendTicketEmail({ to, name, ticketCode, lotName, receiptUrl }: TicketEmailPayload) {
  const subject = `🎭 Ingresso confirmado · Baile da Lagoa (${ticketCode})`;
  const html = getTicketEmailHtml({ name, ticketCode, lotName, receiptUrl });

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
      });

      if (response.error) {
        return { success: false, error: response.error.message, simulated: false };
      }

      return { success: true, id: response.data?.id, simulated: false };
    } catch (err: any) {
      console.error(`Erro ao enviar ingresso para ${to}:`, err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] Ingresso Confirmado`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log(`Ingresso: ${ticketCode} · ${lotName}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}
