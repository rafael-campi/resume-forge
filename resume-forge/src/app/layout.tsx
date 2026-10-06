import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navegacao } from "./navegacao";
import "./globals.css";

export const metadata: Metadata = {
  title: "Candidaturas",
  description: "Painel das candidaturas enviadas pelo bot.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Navegacao />
        <main>{children}</main>
      </body>
    </html>
  );
}
