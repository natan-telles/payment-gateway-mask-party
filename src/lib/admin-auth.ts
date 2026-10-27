import type { NextRequest } from 'next/server';

/**
 * Dois níveis de acesso ao painel:
 * - admin:   ADMIN_PASSWORD — tudo.
 * - checkin: ADMIN_CHECKIN_PASSWORD (opcional) — só a portaria (validar ingressos e ver o contador).
 *   Útil para dar à equipe da entrada no dia da festa sem expor aprovação de pagamento, exclusão etc.
 */
export type AdminRole = 'admin' | 'checkin';

function adminPassword() {
  return process.env.ADMIN_PASSWORD || 'admin123';
}

function checkinPassword() {
  return process.env.ADMIN_CHECKIN_PASSWORD || null;
}

export function resolveRole(password: string | null | undefined): AdminRole | null {
  if (!password) return null;
  if (password === adminPassword()) return 'admin';
  const checkin = checkinPassword();
  if (checkin && password === checkin) return 'checkin';
  return null;
}

/** Senha completa de admin (comportamento antigo de checkAdminAuth) */
export function checkAdminAuth(req: NextRequest) {
  return resolveRole(req.headers.get('x-admin-password')) === 'admin';
}

/** Admin OU senha da portaria */
export function checkCheckinAuth(req: NextRequest) {
  return resolveRole(req.headers.get('x-admin-password')) !== null;
}
