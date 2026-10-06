import { readFileSync } from "node:fs";
import { join } from "node:path";
import { folhaHtml, esc } from "../curriculo/folha";
import type { CurriculoFinal } from "../curriculo/montar";

// O PDF é o HTML da pré-visualização impresso pelo Chromium: mesmo markup (folhaHtml), mesmo CSS, mesma fonte.
// As fontes vão dentro do HTML (base64), então o PDF sai igual em qualquer máquina e sem rede.

const FONTES = [
  { peso: 400, estilo: "normal" },
  { peso: 400, estilo: "italic" },
  { peso: 600, estilo: "normal" },
  { peso: 700, estilo: "normal" },
] as const;

let fontesCache: string | undefined;
function fontesCss(): string {
  fontesCache ??= FONTES.map(({ peso, estilo }) => {
    const arquivo = join(process.cwd(), "node_modules/@fontsource/source-sans-3/files", `source-sans-3-latin-${peso}-${estilo}.woff2`);
    const base64 = readFileSync(arquivo).toString("base64");
    return `@font-face{font-family:"Source Sans 3";font-style:${estilo};font-weight:${peso};src:url(data:font/woff2;base64,${base64}) format("woff2")}`;
  }).join("\n");
  return fontesCache;
}

// Na impressão, as margens vêm do @page (18 mm); a folha deixa de ter o papel simulado da pré-visualização.
const CSS_IMPRESSAO = `
@page { size: A4; margin: 18mm; }
html, body { margin: 0; background: #fff; }
.folha { width: auto; min-height: 0; padding: 0; box-shadow: none; }
.folha .linha-cargo, .folha li { break-inside: avoid; }
.folha h2 { break-after: avoid; }
`;

export function htmlDoCurriculo(c: CurriculoFinal): string {
  const css = readFileSync(join(process.cwd(), "src/curriculo/folha.css"), "utf-8");
  const titulo = c.contato.nome ? `Currículo de ${c.contato.nome}` : "Currículo";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${fontesCss()}\n${css}\n${CSS_IMPRESSAO}</style></head><body>${folhaHtml(c)}</body></html>`;
}
