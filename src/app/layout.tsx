import type { Metadata } from "next";
import { Anton, Space_Mono, Archivo } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BAILE DA LAGOA // 31.10 · SJC",
  description: "A noite das máscaras. Uma festa, uma regra: ninguém entra de cara limpa. Lista oficial de pré-venda do 1º lote.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${anton.variable} ${spaceMono.variable} ${archivo.variable} dark`}
    >
      <body className="min-h-screen bg-[#0B0B0D] text-[#E8E8EF] selection:bg-[#8A3CFF] selection:text-white antialiased relative">
        {/* Camada sutil de scanlines em toda a página (regra do Mídia Kit) */}
        <div className="fixed inset-0 pointer-events-none z-50 scanlines-overlay opacity-30" />
        {children}
      </body>
    </html>
  );
}
