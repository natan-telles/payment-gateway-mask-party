import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || 'Baile da Lagoa <onboarding@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const unsubscribeUrl = `${appUrl}/unsubscribe`;
const unsubscribeApiUrl = `${appUrl}/api/unsubscribe`;

interface EmailPayload {
  to: string;
  name: string;
  queuePosition: number;
  paymentUrl?: string;
  expirationHours?: number;
  /** Rótulo do lote vigente, ex.: "2º LOTE" */
  lotName: string;
}

// Template HTML Oficial Baile da Lagoa - Liberação de Lote
function getReleaseEmailHtml({
  name,
  queuePosition,
  paymentUrl,
  expirationHours = 12,
  lotName,
}: {
  name: string;
  queuePosition: number;
  paymentUrl: string;
  expirationHours?: number;
  lotName: string;
}) {
  const formattedPos = String(queuePosition).padStart(4, '0');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso Liberado · Baile da Lagoa 31.10</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 14px 8px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #141418; border: 1px solid #1F1F24;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 18px; background-color: #8A3CFF; color: #0B0B0D;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                      A Noite das Máscaras · 31.10 · SJC
                    </div>
                    <div style="font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-top: 4px;">
                      Baile da Lagoa
                    </div>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="background-color: #0B0B0D; color: #E8E8EF; font-size: 10px; font-weight: 700; padding: 4px 8px; text-transform: uppercase; font-family: monospace; display: inline-block;">
                      ${lotName}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 22px 18px;">
              <p style="font-size: 13px; color: #8C8C9A; margin: 0 0 14px 0; font-family: monospace;">
                Olá, <strong style="color: #E8E8EF;">${name}</strong>
              </p>

              <h2 style="font-size: 20px; font-weight: 900; color: #E8E8EF; margin: 0 0 16px 0; line-height: 1.3;">
                Seu lugar no ${lotName} está liberado.
              </h2>

              <!-- Posição da Lista (Box compacto) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 16px; text-align: center;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <span style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #8C8C9A; letter-spacing: 2px; display: block;">
                      Seu número na pré-venda
                    </span>
                    <div style="font-size: 32px; font-weight: 900; color: #8A3CFF; line-height: 1.1; margin: 4px 0;">
                      #${formattedPos}
                    </div>
                    <span style="font-size: 10px; color: #8C8C9A; font-family: monospace;">
                      Prioridade ativa
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Regra de Pagamento & Expiração (Box compacto) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border-left: 3px solid #8A3CFF; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 10px 14px;">
                    <div style="font-size: 12px; font-weight: 700; color: #E8E8EF; margin-bottom: 3px;">
                      Prazo de pagamento via PIX: ${expirationHours} horas
                    </div>
                    <div style="font-size: 11px; color: #8C8C9A; line-height: 1.5; font-family: monospace;">
                      O link possui prazo de validade. Caso não complete o pagamento dentro do prazo, a vaga passa para o próximo da lista.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: block; background-color: #FF2E3B; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 13px 18px; text-align: center; letter-spacing: 0.5px;">
                      Garantir ingresso via PIX &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Regra do Evento -->
              <div style="border-top: 1px solid #1F1F24; padding-top: 20px; font-size: 11px; color: #8C8C9A; line-height: 1.6; font-family: monospace; margin-bottom: 24px;">
                <strong style="color: #E8E8EF;">A Regra:</strong><br>
                &bull; Sem máscara, sem entrada.<br>
                &bull; Qualquer máscara vale: veneziana, moderna ou avant-garde.<br>
                &bull; Paleta recomendada: All Black.<br>
                &bull; Local exato em SJC revelado após confirmação do ingresso.
              </div>

              <!-- Rodapé de Conformidade (Antispam) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #1F1F24; padding-top: 16px;">
                <tr>
                  <td style="font-size: 10px; color: #5B5B66; font-family: monospace; line-height: 1.4;">
                    Você está recebendo este e-mail porque se cadastrou na lista do Baile da Lagoa.<br>
                    Caso não queira mais receber avisos, <a href="${unsubscribeUrl}" style="color: #8A3CFF; text-decoration: underline;">clique aqui para cancelar sua inscrição</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 14px 24px; background-color: #0B0B0D; border-top: 1px solid #1F1F24; text-align: center; font-size: 9px; color: #5B5B66; font-family: monospace;">
              Baile da Lagoa · 31.10 · SJC · Uma festa. Uma regra.
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
  lotName,
}: {
  name: string;
  queuePosition: number;
  paymentUrl: string;
  lotName: string;
}) {
  const formattedPos = String(queuePosition).padStart(4, '0');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Último Aviso · Baile da Lagoa</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 14px 8px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #141418; border: 1px solid #1F1F24;">
          <tr>
            <td style="padding: 18px; background-color: #0B0B0D; border-bottom: 2px solid #FF2E3B;">
              <span style="background-color: #FF2E3B; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 6px; text-transform: uppercase; font-family: monospace;">
                Último Aviso
              </span>
              <div style="font-size: 20px; font-weight: 900; color: #E8E8EF; margin-top: 6px;">
                Seu lugar no ${lotName} vai expirar
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 18px;">
              <p style="font-size: 12px; color: #8C8C9A; font-family: monospace; line-height: 1.6; margin: 0 0 16px 0;">
                Olá, ${name}. O prazo para pagamento do seu ingresso no ${lotName} do <strong>Baile da Lagoa</strong> (Posição #${formattedPos}) está nas últimas horas. Caso o PIX não seja confirmado, a vaga passa para o próximo da lista.
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: block; background-color: #FF2E3B; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 13px 18px; text-align: center; letter-spacing: 0.5px;">
                      Concluir pagamento via PIX &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Rodapé de Conformidade (Antispam) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #1F1F24; padding-top: 14px;">
                <tr>
                  <td style="font-size: 10px; color: #5B5B66; font-family: monospace; line-height: 1.4;">
                    Você está recebendo este e-mail porque se cadastrou na lista do Baile da Lagoa.<br>
                    Caso não queira mais receber avisos, <a href="${unsubscribeUrl}" style="color: #8A3CFF; text-decoration: underline;">clique aqui para cancelar sua inscrição</a>.
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

// Template HTML Oficial Baile da Lagoa - Confirmação de Entrada na Fila
function getConfirmationEmailHtml({
  name,
  queuePosition,
  lotName,
}: {
  name: string;
  queuePosition: number;
  lotName: string;
}) {
  const formattedPos = String(queuePosition).padStart(4, '0');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lugar Reservado · Baile da Lagoa 31.10</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;"
  >
    <table
      width="100%"
      border="0"
      cellspacing="0"
      cellpadding="0"
      style="background-color: #0B0B0D; padding: 14px 8px;"
    >
      <tr>
        <td align="center">
          <table
            width="100%"
            border="0"
            cellspacing="0"
            cellpadding="0"
            style="max-width: 480px; background-color: #141418; border: 1px solid #1F1F24;"
          >
            <!-- Header -->
            <tr>
              <td style="padding: 18px; background-color: #8A3CFF; color: #0B0B0D;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div
                        style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;"
                      >
                        A Noite das Máscaras · 31.10 · SJC
                      </div>
                      <div
                        style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-top: 3px;"
                      >
                        Baile da Lagoa
                      </div>
                    </td>
                    <td align="right" style="vertical-align: top;">
                      <span
                        style="background-color: #0B0B0D; color: #E8E8EF; font-size: 10px; font-weight: 700; padding: 3px 6px; text-transform: uppercase; font-family: monospace; display: inline-block;"
                      >
                        ${lotName}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Corpo -->
            <tr>
              <td style="padding: 22px 18px;">
                <p
                  style="font-size: 13px; color: #8C8C9A; margin: 0 0 14px 0; font-family: monospace;"
                >
                  Olá, <strong style="color: #E8E8EF;">${name}</strong>
                </p>

                <h2
                  style="font-size: 20px; font-weight: 900; color: #E8E8EF; margin: 0 0 16px 0; line-height: 1.3;"
                >
                  Seu lugar na fila está confirmado.
                </h2>

                <!-- Posição da Lista (Box compacto) -->
                <table
                  width="100%"
                  border="0"
                  cellspacing="0"
                  cellpadding="0"
                  style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 16px; text-align: center;"
                >
                  <tr>
                    <td style="padding: 12px 14px;">
                      <span
                        style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #8C8C9A; letter-spacing: 2px; display: block;"
                      >
                        Sua posição na fila
                      </span>
                      <div style="font-size: 32px; font-weight: 900; color: #8A3CFF; line-height: 1.1; margin: 4px 0;">
                        #${formattedPos}
                      </div>
                      <span style="font-size: 10px; color: #8C8C9A; font-family: monospace;">
                        Aguardando liberação do ${lotName}
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Regra de Ouro (Box compacto) -->
                <table
                  width="100%"
                  border="0"
                  cellspacing="0"
                  cellpadding="0"
                  style="background-color: #0B0B0D; border-left: 3px solid #FF2E3B; margin-bottom: 16px;"
                >
                  <tr>
                    <td style="padding: 10px 14px;">
                      <div
                        style="font-size: 12px; font-weight: 700; color: #E8E8EF; margin-bottom: 3px;"
                      >
                        Uma festa. Uma regra.
                      </div>
                      <div style="font-size: 11px; color: #FF2E3B; font-weight: 700;">
                        Ninguém entra de cara limpa.
                      </div>
                      <div style="font-size: 10px; color: #8C8C9A; font-family: monospace; margin-top: 3px;">
                        Qualquer máscara vale. O local é secreto até a liberação do bilhete.
                      </div>
                    </td>
                  </tr>
                </table>

                <p
                  style="font-size: 11px; color: #8C8C9A; font-family: monospace; line-height: 1.6; margin: 0 0 18px 0;"
                >
                  Assim que a liberação do ${lotName} for autorizada para a sua posição, você receberá uma notificação direta
                  no WhatsApp e no e-mail com as instruções de acesso.
                </p>

                <!-- Rodapé de Conformidade (Antispam) -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #1F1F24; padding-top: 14px;">
                  <tr>
                    <td style="font-size: 10px; color: #5B5B66; font-family: monospace; line-height: 1.4;">
                      Você está recebendo este e-mail porque se cadastrou na lista do Baile da Lagoa.<br>
                      Caso não queira mais receber avisos, <a href="${unsubscribeUrl}" style="color: #8A3CFF; text-decoration: underline;">clique aqui para cancelar sua inscrição</a>.
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

// 1. Envio de E-mail de Confirmação de Cadastro na Fila
export async function sendQueueConfirmationEmail({
  to,
  name,
  queuePosition,
  lotName,
}: {
  to: string;
  name: string;
  queuePosition: number;
  lotName: string;
}) {
  const subject = `🎭 Lugar reservado na fila do ${lotName} · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getConfirmationEmailHtml({ name, queuePosition, lotName });

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeApiUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (error) {
        console.error(`[Resend Error] Falha ao enviar confirmação para ${to}:`, error);
        return { success: false, error: error.message, simulated: false };
      }

      console.log(`[Resend Success] Confirmação enviada para ${to} (ID: ${data?.id})`);
      return { success: true, id: data?.id, simulated: false };
    } catch (err: any) {
      console.error(`[Resend Exception] Falha de conexão para ${to}:`, err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] Confirmação de Fila`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log(`Posição: #${queuePosition}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}

// 2. Envio de E-mail de Liberação do Lote
export async function sendQueueReleaseEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
  expirationHours = 12,
  lotName,
}: EmailPayload) {
  const subject = `🎭 Seu lugar no ${lotName} está liberado · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getReleaseEmailHtml({ name, queuePosition, paymentUrl, expirationHours, lotName });

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeApiUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (error) {
        console.error(`[Resend Error] Falha ao enviar liberação de lote para ${to}:`, error);
        return { success: false, error: error.message, simulated: false };
      }

      console.log(`[Resend Success] Liberação enviada para ${to} (ID: ${data?.id})`);
      return { success: true, id: data?.id, simulated: false };
    } catch (err: any) {
      console.error(`[Resend Exception] Falha ao enviar e-mail via Resend para ${to}:`, err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] Liberação do ${lotName}`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log(`Posição: #${queuePosition}`);
  console.log(`Link: ${paymentUrl}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}

// 3. Envio de Lembrete
export async function sendReminderEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
  lotName,
}: EmailPayload) {
  const subject = `⚠️ Último aviso: Seu lugar no ${lotName} expira em breve (Posição #${queuePosition})`;
  const html = getReminderEmailHtml({ name, queuePosition, paymentUrl, lotName });

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeApiUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (error) {
        console.error(`[Resend Error] Falha ao enviar lembrete para ${to}:`, error);
        return { success: false, error: error.message, simulated: false };
      }

      console.log(`[Resend Success] Lembrete enviado para ${to} (ID: ${data?.id})`);
      return { success: true, id: data?.id, simulated: false };
    } catch (err: any) {
      console.error(`[Resend Exception] Falha ao enviar lembrete para ${to}:`, err);
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ingresso Confirmado · Baile da Lagoa</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 14px 8px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #141418; border: 1px solid #1F1F24;">
          <tr>
            <td style="padding: 18px; background-color: #8A3CFF; color: #0B0B0D;">
              <div style="font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                A Noite das Máscaras · 31.10 · SJC
              </div>
              <div style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-top: 3px;">
                Ingresso Confirmado
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 18px;">
              <p style="font-size: 13px; color: #8C8C9A; margin: 0 0 14px 0; font-family: monospace;">
                Olá, <strong style="color: #E8E8EF;">${name}</strong>
              </p>
              <p style="font-size: 12px; color: #8C8C9A; font-family: monospace; line-height: 1.6; margin: 0 0 16px 0;">
                Seu pagamento foi confirmado com sucesso. Apresente o código abaixo na portaria do <strong style="color: #E8E8EF;">Baile da Lagoa</strong>.
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 16px; text-align: center;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <span style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #8C8C9A; letter-spacing: 2px; display: block;">
                      Código do Ingresso · ${lotName}
                    </span>
                    <div style="font-size: 28px; font-weight: 900; color: #8A3CFF; line-height: 1.1; margin: 6px 0; font-family: monospace;">
                      ${ticketCode}
                    </div>
                  </td>
                </tr>
              </table>

              ${
                receiptUrl
                  ? `<p style="font-size: 11px; font-family: monospace; margin: 0 0 18px 0;"><a href="${receiptUrl}" style="color: #8A3CFF; text-decoration: underline;">Ver comprovante de pagamento &rarr;</a></p>`
                  : ''
              }

              <div style="border-top: 1px solid #1F1F24; padding-top: 16px; font-size: 11px; color: #8C8C9A; line-height: 1.6; font-family: monospace; margin-bottom: 18px;">
                <strong style="color: #E8E8EF;">Instruções:</strong><br>
                &bull; Sem máscara, sem entrada.<br>
                &bull; Ingresso pessoal e intransferível.<br>
                &bull; O local exato em SJC será enviado aos portadores de ingresso.
              </div>

              <!-- Rodapé de Conformidade (Antispam) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #1F1F24; padding-top: 14px;">
                <tr>
                  <td style="font-size: 10px; color: #5B5B66; font-family: monospace; line-height: 1.4;">
                    Você está recebendo este e-mail referente à sua compra no Baile da Lagoa.<br>
                    Em caso de dúvidas, responda diretamente a este e-mail.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 18px; background-color: #0B0B0D; border-top: 1px solid #1F1F24; text-align: center; font-size: 9px; color: #5B5B66; font-family: monospace;">
              Baile da Lagoa · 31.10 · SJC · Uma festa. Uma regra.
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
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeApiUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (error) {
        console.error(`[Resend Error] Falha ao enviar ingresso para ${to}:`, error);
        return { success: false, error: error.message, simulated: false };
      }

      console.log(`[Resend Success] Ingresso enviado para ${to} (ID: ${data?.id})`);
      return { success: true, id: data?.id, simulated: false };
    } catch (err: any) {
      console.error(`[Resend Exception] Falha ao enviar ingresso para ${to}:`, err);
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
