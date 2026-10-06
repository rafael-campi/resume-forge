import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import type { CurriculoFinal } from "../curriculo/montar";
import { htmlDoCurriculo } from "./html";

export type PdfGerado = { pdf: Buffer; paginas: number };

export async function contarPaginas(pdf: Uint8Array): Promise<number> {
  return (await PDFDocument.load(pdf)).getPageCount();
}

/** Imprime a folha do currículo num A4 com o Chromium e conta as páginas do PDF que saiu (esse é o número que vale). */
export async function gerarPdf(c: CurriculoFinal): Promise<PdfGerado> {
  let navegador;
  try {
    navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  } catch (erro) {
    throw new Error(`Não consegui abrir o Chromium para gerar o PDF. Rode "npx playwright install chromium" ou aponte CHROMIUM_PATH para um Chromium instalado. (${(erro as Error).message.split("\n")[0]})`);
  }
  try {
    const pagina = await navegador.newPage();
    await pagina.setContent(htmlDoCurriculo(c), { waitUntil: "load" });
    await pagina.evaluate(() => document.fonts.ready);
    const pdf = Buffer.from(await pagina.pdf({ preferCSSPageSize: true, printBackground: true }));
    return { pdf, paginas: await contarPaginas(pdf) };
  } finally {
    await navegador.close();
  }
}
