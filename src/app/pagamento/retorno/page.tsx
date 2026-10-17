import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PaymentReturn } from '@/components/PaymentReturn';

export default function PaymentReturnPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-[#8A3CFF]" />}>
        <PaymentReturn />
      </Suspense>
    </main>
  );
}
