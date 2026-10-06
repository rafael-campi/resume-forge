"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { gerarExportacao } from "./acoes";

type Resultado = { ok: true; exportacaoId: number; paginas: number } | { ok: false; erro: string };

export function BotaoExportar({ vagaId, geracaoId }: { vagaId: number; geracaoId: number }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function gerar() {
    setGerando(true);
    setResultado(null);
    const r = await gerarExportacao(vagaId, geracaoId).catch(() => ({ ok: false as const, erro: "Sem conexão com o servidor." }));
    setGerando(false);
    setResultado(r);
    if (r.ok) router.refresh();
  }

  return (
    <div className="exportar-acao">
      <button type="button" className="principal" onClick={gerar} disabled={gerando}>{gerando ? "Gerando o PDF…" : "Gerar PDF"}</button>
      <div role="status" aria-live="polite">
        {gerando && <p className="suave">Imprimindo no Chromium e contando as páginas. Leva alguns segundos.</p>}
        {resultado?.ok && (
          <p>
            PDF gerado: {resultado.paginas} {resultado.paginas === 1 ? "página" : "páginas"}.{" "}
            <a href={`/vagas/${vagaId}/exportar/pdf?exportacao=${resultado.exportacaoId}`}>Baixar PDF</a>
          </p>
        )}
      </div>
      {resultado && !resultado.ok && <p className="erro-form" role="alert">{resultado.erro}</p>}
    </div>
  );
}
