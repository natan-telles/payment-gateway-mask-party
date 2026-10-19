import Link from 'next/link';

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#141418] border border-[#1F1F24] p-8 text-center space-y-6">
        <div className="inline-block px-3 py-1 bg-[#8A3CFF]/20 text-[#8A3CFF] text-xs font-mono font-bold tracking-wider uppercase border border-[#8A3CFF]/40">
          Preferências de E-mail
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#E8E8EF]">
          Inscrição Cancelada
        </h1>

        <p className="text-sm text-[#8C8C9A] leading-relaxed">
          Você foi removido da lista de notificações do <strong className="text-[#E8E8EF]">Baile da Lagoa</strong>. Você não receberá mais comunicados de novos lotes ou lembretes promocionais.
        </p>

        <div className="pt-4 border-t border-[#1F1F24]">
          <Link
            href="/"
            className="inline-block text-xs font-mono text-[#8A3CFF] hover:underline"
          >
            &larr; Voltar para a página inicial
          </Link>
        </div>
      </div>
    </main>
  );
}

