import { Resend } from 'resend';
import QRCode from 'qrcode';
import { logNotification, NotificationKind } from './log';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || 'Baile da Lagoa <onboarding@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const unsubscribeUrl = `${appUrl}/unsubscribe`;
const unsubscribeApiUrl = `${appUrl}/api/unsubscribe`;

export interface SendResult {
  success: boolean;
  id?: string;
  simulated: boolean;
  error?: string;
  /** Nome do erro do Resend, ex.: daily_quota_exceeded, rate_limit_exceeded */
  errorCode?: string;
  /** true quando o Resend recusou por cota diária ou mensal esgotada */
  quotaExceeded: boolean;
}

export const QUOTA_ERROR_CODES = ['daily_quota_exceeded', 'monthly_quota_exceeded'];

export function isQuotaError(code?: string | null) {
  return Boolean(code && QUOTA_ERROR_CODES.includes(code));
}

const KIND_LABELS: Record<NotificationKind, string> = {
  confirmation: 'Confirmação de fila',
  release: 'Liberação de lote',
  reminder: 'Lembrete',
  ticket: 'Ingresso',
  test: 'Teste',
  batch: 'Lote',
  usage: 'Cota',
};

interface DeliverContext {
  kind: NotificationKind;
  to: string;
  name: string;
  subject: string;
  html: string;
  leadId?: string | null;
  meta?: Record<string, unknown>;
  /** Linhas extras impressas no simulador (sem RESEND_API_KEY) */
  simulatorLines?: string[];
  /** Anexos (ex.: QR Code do ingresso embutido via cid:) */
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  filename: string;
  /** conteúdo em base64 */
  content: string;
  contentType: string;
  /** quando definido, a imagem pode ser referenciada no HTML como <img src="cid:..."> */
  contentId?: string;
}

// Ponto único de envio: chama o Resend, classifica o erro (cota, rate limit, etc.)
// e grava em notification_logs toda falha — e o sucesso dos ingressos.
async function deliver(ctx: DeliverContext): Promise<SendResult> {
  const label = KIND_LABELS[ctx.kind];

  if (!resend) {
    console.log('------------------------------------------------------------');
    console.log(`[SIMULADOR DE E-MAIL BAILE DA LAGOA] ${label}`);
    console.log(`Para: ${ctx.to} (${ctx.name})`);
    console.log(`Assunto: ${ctx.subject}`);
    for (const line of ctx.simulatorLines ?? []) console.log(line);
    console.log('------------------------------------------------------------');
    return { success: true, simulated: true, quotaExceeded: false };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: ctx.to,
      subject: ctx.subject,
      html: ctx.html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeApiUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      attachments: ctx.attachments,
    });

    if (error) {
      const errorCode = (error as { name?: string }).name;
      const quotaExceeded = isQuotaError(errorCode);
      console.error(`[Resend Error] Falha ao enviar ${label} para ${ctx.to}:`, error);
      await logNotification({
        level: 'error',
        kind: ctx.kind,
        message: quotaExceeded
          ? `${label} NÃO enviado para ${ctx.to}: cota do Resend esgotada (${errorCode}).`
          : `${label} NÃO enviado para ${ctx.to}: ${error.message}`,
        email: ctx.to,
        leadId: ctx.leadId,
        errorCode,
        meta: { ...ctx.meta, subject: ctx.subject },
      });
      return { success: false, simulated: false, error: error.message, errorCode, quotaExceeded };
    }

    console.log(`[Resend Success] ${label} enviado para ${ctx.to} (ID: ${data?.id})`);
    if (ctx.kind === 'ticket') {
      await logNotification({
        level: 'info',
        kind: 'ticket',
        message: `Ingresso enviado para ${ctx.to}.`,
        email: ctx.to,
        leadId: ctx.leadId,
        meta: { ...ctx.meta, resendId: data?.id },
      });
    }
    return { success: true, id: data?.id, simulated: false, quotaExceeded: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    console.error(`[Resend Exception] Falha ao enviar ${label} para ${ctx.to}:`, err);
    await logNotification({
      level: 'error',
      kind: ctx.kind,
      message: `${label} NÃO enviado para ${ctx.to}: exceção de conexão (${message}).`,
      email: ctx.to,
      leadId: ctx.leadId,
      errorCode: 'exception',
      meta: { ...ctx.meta, subject: ctx.subject },
    });
    return { success: false, simulated: false, error: message, errorCode: 'exception', quotaExceeded: false };
  }
}

interface EmailPayload {
  to: string;
  name: string;
  queuePosition: number;
  paymentUrl?: string;
  expirationHours?: number;
  /** Rótulo do lote vigente, ex.: "2º LOTE" */
  lotName: string;
  /** id em waiting_queue, para o log */
  leadId?: string | null;
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
                &bull; Local: Av. Gen. Motors, 1159 - Ronda, São José dos Campos - SP, 12221-842.
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
                        Qualquer máscara vale. Local: Av. Gen. Motors, 1159 - Ronda, SJC.
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
  leadId,
}: {
  to: string;
  name: string;
  queuePosition: number;
  lotName: string;
  leadId?: string | null;
}): Promise<SendResult> {
  const subject = `🎭 Lugar reservado na fila do ${lotName} · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getConfirmationEmailHtml({ name, queuePosition, lotName });

  return deliver({
    kind: 'confirmation',
    to,
    name,
    subject,
    html,
    leadId,
    meta: { queuePosition, lotName },
    simulatorLines: [`Posição: #${queuePosition}`],
  });
}

// 2. Envio de E-mail de Liberação do Lote
export async function sendQueueReleaseEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
  expirationHours = 12,
  lotName,
  leadId,
}: EmailPayload): Promise<SendResult> {
  const subject = `🎭 Seu lugar no ${lotName} está liberado · Baile da Lagoa (Posição #${queuePosition})`;
  const html = getReleaseEmailHtml({ name, queuePosition, paymentUrl, expirationHours, lotName });

  return deliver({
    kind: 'release',
    to,
    name,
    subject,
    html,
    leadId,
    meta: { queuePosition, lotName, expirationHours },
    simulatorLines: [`Posição: #${queuePosition}`, `Link: ${paymentUrl}`],
  });
}

// 3. Envio de Lembrete
export async function sendReminderEmail({
  to,
  name,
  queuePosition,
  paymentUrl = `${appUrl}?checkout=true`,
  lotName,
  leadId,
}: EmailPayload): Promise<SendResult> {
  const subject = `⚠️ Último aviso: Seu lugar no ${lotName} expira em breve (Posição #${queuePosition})`;
  const html = getReminderEmailHtml({ name, queuePosition, paymentUrl, lotName });

  return deliver({
    kind: 'reminder',
    to,
    name,
    subject,
    html,
    leadId,
    meta: { queuePosition, lotName },
  });
}

interface TicketEmailPayload {
  to: string;
  name: string;
  ticketCode: string;
  lotName: string;
  receiptUrl?: string | null;
  leadId?: string | null;
  /** 'courtesy' muda os textos do e-mail (sem pagamento, sem lote) */
  kind?: 'paid' | 'courtesy';
  /** PDF do ingresso para ir em anexo */
  pdf?: { filename: string; content: Buffer } | null;
}

// Template HTML de Ingresso Confirmado Baile da Lagoa
function getTicketEmailHtml({ name, ticketCode, lotName, receiptUrl, hasQr, kind = 'paid', pdf }: Omit<TicketEmailPayload, 'to'> & { hasQr: boolean }) {
  const isCourtesy = kind === 'courtesy';
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
                ${isCourtesy ? 'Ingresso Cortesia' : 'Ingresso Confirmado'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 18px;">
              <p style="font-size: 13px; color: #8C8C9A; margin: 0 0 14px 0; font-family: monospace;">
                Olá, <strong style="color: #E8E8EF;">${name}</strong>
              </p>
              <p style="font-size: 12px; color: #8C8C9A; font-family: monospace; line-height: 1.6; margin: 0 0 16px 0;">
                ${
                  isCourtesy
                    ? 'Você ganhou um <strong style="color: #E8E8EF;">ingresso cortesia</strong> para o Baile da Lagoa. Apresente o QR Code abaixo na portaria. Vale também mostrar só o código.'
                    : 'Seu pagamento foi confirmado com sucesso. Apresente o QR Code abaixo na portaria do <strong style="color: #E8E8EF;">Baile da Lagoa</strong>. Vale também mostrar só o código.'
                }
              </p>
              ${
                pdf
                  ? `<p style="font-size: 11px; color: #8C8C9A; font-family: monospace; line-height: 1.6; margin: 0 0 14px 0;">
                📎 Seu ingresso também vai em <strong style="color: #E8E8EF;">PDF anexo</strong> (${pdf.filename}) — salve no celular para apresentar na entrada.
              </p>`
                  : ''
              }

              ${
                hasQr
                  ? `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; text-align: center;">
                <tr>
                  <td style="padding: 14px; background-color: #FFFFFF; border: 2px solid #8A3CFF;">
                    <img src="cid:${TICKET_QR_CID}" alt="QR Code do ingresso ${ticketCode}" width="220" height="220" style="display: block; margin: 0 auto; width: 220px; height: 220px; max-width: 100%;">
                    <div style="font-size: 10px; font-family: monospace; color: #0B0B0D; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">
                      QR Code válido para entrada
                    </div>
                  </td>
                </tr>
              </table>
              <p style="font-size: 10px; color: #5B5B66; font-family: monospace; line-height: 1.5; margin: 0 0 16px 0; text-align: center;">
                Não está vendo a imagem? Ela também vai em anexo (${TICKET_QR_FILENAME}) e você pode abrir seu ingresso em <a href="${appUrl}" style="color: #8A3CFF; text-decoration: underline;">${appUrl.replace(/^https?:\/\//, '')}</a> consultando pelo seu e-mail ou telefone.
              </p>`
                  : ''
              }

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; border: 1px solid #1F1F24; margin-bottom: 16px; text-align: center;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <span style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #8C8C9A; letter-spacing: 2px; display: block;">
                      Código do Ingresso · ${isCourtesy ? 'CORTESIA' : lotName}
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
                &bull; Local: Av. Gen. Motors, 1159 - Ronda, São José dos Campos - SP, 12221-842.
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
const TICKET_QR_CID = 'ticket-qr';
const TICKET_QR_FILENAME = 'ingresso-qrcode.png';

// Gera o PNG do QR Code do ingresso (mesmo conteúdo que a portaria lê: o código puro).
// Fundo branco e módulos escuros para a câmera ler bem; se falhar, o e-mail vai só com o código.
async function buildTicketQrAttachment(ticketCode: string): Promise<EmailAttachment | null> {
  try {
    const png = await QRCode.toBuffer(ticketCode, {
      type: 'png',
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B0B0D', light: '#FFFFFF' },
    });
    return {
      filename: TICKET_QR_FILENAME,
      content: png.toString('base64'),
      contentType: 'image/png',
      contentId: TICKET_QR_CID,
    };
  } catch (err) {
    console.error(`[Ingresso] Falha ao gerar QR Code de ${ticketCode}:`, err);
    await logNotification({
      level: 'warn',
      kind: 'ticket',
      message: `QR Code do ingresso ${ticketCode} não pôde ser gerado; e-mail enviado só com o código.`,
      errorCode: 'qr_generation_failed',
      meta: { ticketCode },
    });
    return null;
  }
}

export async function sendTicketEmail({ to, name, ticketCode, lotName, receiptUrl, leadId, kind = 'paid', pdf }: TicketEmailPayload): Promise<SendResult> {
  const subject = kind === 'courtesy'
    ? `🎭 Seu ingresso cortesia · Baile da Lagoa (${ticketCode})`
    : `🎭 Ingresso confirmado · Baile da Lagoa (${ticketCode})`;
  const qr = await buildTicketQrAttachment(ticketCode);
  const html = getTicketEmailHtml({ name, ticketCode, lotName, receiptUrl, hasQr: qr !== null, kind, pdf });
  const attachments: EmailAttachment[] = [];
  if (qr) attachments.push(qr);
  if (pdf) attachments.push({ filename: pdf.filename, content: pdf.content.toString('base64'), contentType: 'application/pdf' });

  return deliver({
    kind: 'ticket',
    to,
    name,
    subject,
    html,
    leadId,
    meta: { ticketCode, lotName, kind, qrAttached: qr !== null, pdfAttached: Boolean(pdf) },
    simulatorLines: [
      `Ingresso: ${ticketCode} · ${kind === 'courtesy' ? 'CORTESIA' : lotName}`,
      `QR Code: ${qr ? 'anexado (' + TICKET_QR_FILENAME + ')' : 'não gerado'}`,
      `PDF: ${pdf ? 'anexado (' + pdf.filename + ')' : 'não'}`,
    ],
    attachments: attachments.length ? attachments : undefined,
  });
}
