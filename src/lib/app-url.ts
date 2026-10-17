const LOCAL_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;

// URL pública do app, usada em links de e-mail, webhooks e retorno de pagamento.
// APP_URL é lida em runtime; NEXT_PUBLIC_APP_URL é fixada no momento do build.
// Valores apontando para localhost são ignorados quando a requisição chega por um domínio real,
// e sem nenhuma variável válida usa o domínio da própria requisição (requestOrigin).
export function getAppUrl(requestOrigin?: string) {
  const configured = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL].filter(
    (url): url is string => Boolean(url?.trim())
  );
  const requestIsPublic = Boolean(requestOrigin && !LOCAL_URL.test(requestOrigin));

  const url =
    configured.find((candidate) => !requestIsPublic || !LOCAL_URL.test(candidate)) ??
    requestOrigin ??
    'http://localhost:3000';

  return url.trim().replace(/\/$/, '');
}
