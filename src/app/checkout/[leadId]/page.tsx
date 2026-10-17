import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CheckoutPanel } from '@/components/CheckoutPanel';

export default function CheckoutPage({ params }: { params: Promise<{ leadId: string }> }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-[#8A3CFF]" />}>
        <CheckoutContent params={params} />
      </Suspense>
    </main>
  );
}

async function CheckoutContent({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <CheckoutPanel leadId={leadId} />;
}
