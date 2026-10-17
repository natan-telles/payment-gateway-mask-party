import { infinitePayProvider } from './infinitepay';
import { mercadoPagoProvider } from './mercadopago';
import { PaymentProvider } from './types';

const providers: Record<string, PaymentProvider> = {
  infinitepay: infinitePayProvider,
  mercadopago: mercadoPagoProvider,
};

export function getPaymentProvider(name = process.env.PAYMENT_PROVIDER || 'infinitepay') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Gateway de pagamento "${name}" não implementado.`);
  }
  return provider;
}

export function isSupabaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project-ref')
  );
}

export type { PaymentProvider, PaymentReference, WebhookRequest } from './types';
