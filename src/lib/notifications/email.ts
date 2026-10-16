import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || 'Mask Party <ingressos@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailPayload {
  to: string;
  name: string;
  queuePosition: number;
  paymentUrl?: string;
  expirationHours?: number;
}

// Template HTML Oficial no Estilo Neo-Brutalista (Caravana Ascend)
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
  <title>Sua Prioridade Chegou // Mask Party 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #000000; border: 3px solid #ffffff; box-shadow: 8px 8px 0px 0px #FF5722;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px; background-color: #000000; border-bottom: 2px solid #27272a;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-family: monospace; color: #FF5722; text-transform: uppercase; letter-spacing: 2px;">
                      // THE WAITING QUEUE RELEASE
                    </div>
                    <div style="font-size: 32px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: -1px; margin-top: 4px;">
                      MASK PARTY <span style="color: #F3FF33;">2026</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: #FF5722; color: #000000; font-size: 11px; font-weight: 900; padding: 4px 8px; text-transform: uppercase; font-family: monospace;">
                      1º LOTE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do Bilhete -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 14px; color: #a1a1aa; text-transform: uppercase; margin: 0 0 16px 0; font-family: monospace;">
                Olá, <strong style="color: #ffffff;">${name.toUpperCase()}</strong>!
              </p>

              <h2 style="font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; margin: 0 0 24px 0; line-height: 1.2;">
                SUA VEZ NA FILA CHEGOU. SEU INGRESSO ESTÁ <span style="color: #F3FF33;">LIBERADO</span>!
              </h2>

              <!-- Card Posição da Fila -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f0f11; border: 2px solid #ffffff; margin-bottom: 24px; text-align: center;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #a1a1aa; letter-spacing: 2px; display: block;">
                      SUA POSIÇÃO PRIORITÁRIA
                    </span>
                    <div style="font-size: 54px; font-weight: 900; color: #FF5722; line-height: 1; margin: 8px 0;">
                      #${formattedPos}
                    </div>
                    <span style="background-color: #F3FF33; color: #000000; font-size: 10px; font-weight: 900; padding: 2px 6px; text-transform: uppercase; font-family: monospace;">
                      ORDEM CRONOLÓGICA CONFIRMADA
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Alerta de Expiração -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1c1917; border-left: 4px solid #FF5722; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px;">
                    <div style="font-size: 12px; font-weight: 800; color: #FF5722; text-transform: uppercase; margin-bottom: 4px;">
                      ⚠️ IMPORTANTE: PRAZO DE PAGAMENTO VIA PIX
                    </div>
                    <div style="font-size: 12px; color: #d6d3d1; line-height: 1.4;">
                      Para garantir seu ingresso e evitar cambistas, você possui <strong>${expirationHours} horas</strong> para efetuar o pagamento. Caso não complete o PIX a tempo, a vaga retorna para o próximo da fila.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Botão Principal de Pagamento -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: block; background-color: #FF5722; color: #000000; font-size: 15px; font-weight: 900; text-decoration: none; text-transform: uppercase; padding: 18px 24px; text-align: center; border: 2px solid #ffffff; box-shadow: 4px 4px 0px 0px #ffffff; letter-spacing: 1px;">
                      PAGAR VIA PIX & GARANTIR INGRESSO &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Regras e Dress Code -->
              <div style="border-top: 1px dashed #3f3f46; padding-top: 20px; font-size: 11px; color: #71717a; line-height: 1.6; font-family: monospace;">
                <strong style="color: #ffffff; text-transform: uppercase;">Diretrizes do Evento:</strong><br>
                &bull; Dress Code: <strong>Máscara obrigatória</strong> (estilo avant-garde, moderna ou veneziana).<br>
                &bull; Paleta recomendada: <strong>All Black & Dark Glam</strong>.<br>
                &bull; Local secreto: Revelado via WhatsApp após aprovação do pagamento.<br>
                &bull; Dúvidas ou suporte: Responda diretamente a este e-mail.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #09090b; border-top: 2px solid #27272a; text-align: center; font-size: 10px; color: #52525b; font-family: monospace; text-transform: uppercase;">
              MASK PARTY 2026 // GESTÃO DE ACESSOS & FILA IMUTÁVEL
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

// Template HTML de Lembrete / Último Aviso
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
  <title>Último Aviso // Mask Party 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #000000; border: 3px solid #F3FF33; box-shadow: 8px 8px 0px 0px #FF5722;">
          <tr>
            <td style="padding: 24px; background-color: #000000; border-bottom: 2px solid #27272a;">
              <span style="background-color: #F3FF33; color: #000000; font-size: 11px; font-weight: 900; padding: 3px 8px; text-transform: uppercase; font-family: monospace;">
                URGENTE // ÚLTIMAS HORAS
              </span>
              <div style="font-size: 28px; font-weight: 900; color: #ffffff; text-transform: uppercase; margin-top: 8px;">
                SEU INGRESSO VAI EXPIRAR!
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 13px; color: #d4d4d8; line-height: 1.5; margin: 0 0 20px 0;">
                Olá, <strong>${name}</strong>. Notamos que você ainda não concluiu o pagamento do seu ingresso para a <strong>Mask Party 2026</strong> (Posição #${formattedPos}).
              </p>

              <div style="background-color: #18181b; border: 2px dashed #FF5722; padding: 16px; margin-bottom: 24px; text-align: center;">
                <span style="font-size: 12px; font-family: monospace; color: #FF5722; font-weight: 900; text-transform: uppercase; display: block;">
                  A vaga passará para o próximo da fila caso o PIX não seja confirmado.
                </span>
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: block; background-color: #F3FF33; color: #000000; font-size: 15px; font-weight: 900; text-decoration: none; text-transform: uppercase; padding: 18px 24px; text-align: center; border: 2px solid #ffffff; box-shadow: 4px 4px 0px 0px #FF5722; letter-spacing: 1px;">
                      PAGAR AGORA E GARANTIR INGRESSO &rarr;
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

// Envio de E-mail de Liberação da Fila
export async function sendQueueReleaseEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
  expirationHours = 12,
}: EmailPayload) {
  const subject = `🎭 Sua vez chegou! Ingressos Liberados // Mask Party 2026 (Posição #${queuePosition})`;
  const html = getReleaseEmailHtml({ name, queuePosition, paymentUrl, expirationHours });

  // Se a chave do Resend estiver configurada, faz o disparo real
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

  // Fallback de Simulação (Desenvolvimento sem chave de API)
  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL] Liberação de Lote`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log(`Posição na Fila: #${queuePosition}`);
  console.log(`Link de Pagamento: ${paymentUrl}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}

// Envio de E-mail de Lembrete / Expiração
export async function sendReminderEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
}: EmailPayload) {
  const subject = `⚠️ Último Aviso: Seu ingresso na Mask Party expira em breve! (Posição #${queuePosition})`;
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

  // Simulação em dev
  console.log('------------------------------------------------------------');
  console.log(`[SIMULADOR DE E-MAIL] Lembrete de Pagamento`);
  console.log(`Para: ${to} (${name})`);
  console.log(`Assunto: ${subject}`);
  console.log('------------------------------------------------------------');

  return { success: true, simulated: true };
}
