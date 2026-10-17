import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || 'Baile da Lagoa <onboarding@resend.dev>';
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

// Template HTML Oficial Baile da Lagoa - Confirmação de Entrada na Fila
function getConfirmationEmailHtml({
  name,
  queuePosition,
}: {
  name: string;
  queuePosition: number;
}) {
  const formattedPos = String(queuePosition).padStart(4, '0');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lugar Reservado · Baile da Lagoa 31.10</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8E8EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 30px 15px;">
    <tr>
      <td align="center">
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
                      PRÉ-VENDA
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 13px; color: #5B5B66; text-transform: uppercase; margin: 0 0 16px 0; font-family: monospace;">
                Olá, <strong style="color: #E8E8EF;">${name.toUpperCase()}</strong>
              </p>

              <h2 style="font-size: 22px; font-weight: 900; color: #E8E8EF; text-transform: uppercase; margin: 0 0 20px 0; line-height: 1.2;">
                SEU LUGAR NA FILA ESTÁ CONFIRMADO.
              </h2>

              <!-- Posição da Lista -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 24px; text-align: center;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #5B5B66; letter-spacing: 2px; display: block;">
                      SUA POSIÇÃO NA FILA
                    </span>
                    <div style="font-size: 52px; font-weight: 900; color: #8A3CFF; line-height: 1; margin: 8px 0;">
                      #${formattedPos}
                    </div>
                    <span style="font-size: 10px; color: #5B5B66; text-transform: uppercase; font-family: monospace;">
                      AGUARDANDO LIBERAÇÃO DO 1º LOTE
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Regra de Ouro -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border-left: 3px solid #FF2E3B; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #E8E8EF; text-transform: uppercase; margin-bottom: 4px;">
                      UMA FESTA. UMA REGRA.
                    </div>
                    <div style="font-size: 11px; color: #FF2E3B; font-weight: 700; text-transform: uppercase;">
                      NINGUÉM ENTRA DE CARA LIMPA.
                    </div>
                    <div style="font-size: 10px; color: #5B5B66; font-family: monospace; margin-top: 4px;">
                      Qualquer máscara vale. O local é secreto até a liberação do bilhete.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 11px; color: #5B5B66; font-family: monospace; line-height: 1.6; margin: 0 0 24px 0;">
                Assim que a pré-venda do 1º Lote for liberada para a sua posição, você receberá uma notificação direta no WhatsApp e no e-mail com a sua chave PIX exclusiva e prazo limite de pagamento.
              </p>
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
}: {
  to: string;
  name: string;
  queuePosition: number;
}) {
  const subject = `🎭 Lugar reservado na fila do 1º Lote · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getConfirmationEmailHtml({ name, queuePosition });

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
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
}: EmailPayload) {
  const subject = `🎭 Seu lugar no 1º Lote está liberado · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getReleaseEmailHtml({ name, queuePosition, paymentUrl, expirationHours });

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
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
  console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] Liberação de Lote 1`);
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
}: EmailPayload) {
  const subject = `⚠️ Último aviso: Seu ingresso no Baile da Lagoa expira em breve (Posição #${queuePosition})`;
  const html = getReminderEmailHtml({ name, queuePosition, paymentUrl });

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
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
