import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Fontes do Google carregadas pelo próprio Next (ficam rápidas e sem piscar)
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display", // usada nos títulos
});
const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body", // usada nos textos
});

// Título e descrição que aparecem na aba do navegador e no Google
export const metadata: Metadata = {
  title: "Brasil Downloads: baixe vídeos das redes sociais",
  description:
    "Baixe vídeos e áudios do Instagram, TikTok, Facebook, LinkedIn e YouTube. Grátis, sem anúncios e sem cadastro.",
  manifest: "/manifest.webmanifest", // é isto que transforma o site em app instalável
  appleWebApp: { capable: true, title: "Brasil DL" }, // "Adicionar à Tela de Início" no iPhone
};

// Cor da barra do celular quando o app está aberto
export const viewport: Viewport = {
  themeColor: "#0a6b3c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}