import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MASK PARTY // LISTA DE ESPERA",
  description: "Fila de espera oficial para a Mask Party. Garanta sua prioridade na liberação dos ingressos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${inter.variable} dark`}>
      <body className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF5722] selection:text-black antialiased relative">
        {children}
      </body>
    </html>
  );
}
