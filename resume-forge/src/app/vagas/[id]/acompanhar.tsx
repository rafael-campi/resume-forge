"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Enquanto a análise roda, recarrega os dados do servidor a cada poucos segundos. */
export function Acompanhar({ etapa }: { etapa: "requisitos" | "selecao" | null }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="andamento" role="status" aria-live="polite">
      <p><strong>{etapa === "selecao" ? "Passo 2 de 2: escolhendo o que mostrar do seu currículo mestre…" : "Passo 1 de 2: extraindo os requisitos da vaga…"}</strong></p>
      <p className="suave">Costuma levar de 1 a 2 minutos. Você pode sair desta página: a análise continua e a vaga fica na lista.</p>
    </div>
  );
}
