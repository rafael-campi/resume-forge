// Lê o PDF "Salvar como PDF" do perfil do LinkedIn e devolve as linhas com posição e tamanho da fonte.
// O perfil tem duas colunas (lateral e principal); cada coluna é lida de cima para baixo, separadamente.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type Linha = { texto: string; coluna: "lateral" | "principal"; pagina: number; y: number; h: number };

export async function linhasDoPdf(dados: Uint8Array): Promise<Linha[]> {
  const tarefa = getDocument({ data: dados, useSystemFonts: false });
  const doc = await tarefa.promise;
  try {
    const linhas: Linha[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const pagina = await doc.getPage(p);
      const largura = pagina.view[2]! - pagina.view[0]!;
      const { items } = await pagina.getTextContent();
      const grupos = new Map<string, { x: number; texto: string; h: number }[]>();
      for (const it of items) {
        if (!("str" in it) || !it.str.trim()) continue;
        const x = it.transform[4]!, y = Math.round(it.transform[5]!);
        const coluna = x < largura * 0.3 ? "lateral" : "principal";
        const chave = `${coluna}|${y}`;
        (grupos.get(chave) ?? grupos.set(chave, []).get(chave)!).push({ x, texto: it.str, h: it.height });
      }
      for (const [chave, partes] of grupos) {
        const [coluna, y] = chave.split("|") as ["lateral" | "principal", string];
        partes.sort((a, b) => a.x - b.x);
        const texto = partes.reduce((acc, t) => (!acc ? t.texto : /\s$/.test(acc) || /^\s/.test(t.texto) ? acc + t.texto : `${acc} ${t.texto}`), "").replace(/\s+/g, " ").trim();
        linhas.push({ texto, coluna, pagina: p, y: Number(y), h: Math.max(...partes.map((t) => t.h)) });
      }
    }
    return linhas.sort((a, b) => a.pagina - b.pagina || b.y - a.y);
  } finally {
    await tarefa.destroy();
  }
}
