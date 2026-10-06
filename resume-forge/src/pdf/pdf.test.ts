import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { montarCurriculo } from "../curriculo/montar";
import type { CurriculoFinal } from "../curriculo/montar";
import { esquemaMestre } from "../mestre/esquema";
import { estadoInicial } from "../revisao/estado";
import { contarPaginas, gerarPdf } from "./gerar";
import { folhaHtml } from "../curriculo/folha";
import { htmlDoCurriculo } from "./html";

// Sem Chromium instalado ("npx playwright install chromium"), os testes que imprimem são pulados.
const temChromium = await chromium
  .launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  .then((b) => b.close().then(() => true), () => false);

function curriculo(bulletsExtras = 0): CurriculoFinal {
  const extras = Array.from({ length: bulletsExtras }, (_, n) => ({ id: `x${n}`, texto: `Atividade de rotina número ${n + 1}, descrevendo uma entrega longa com várias palavras para ocupar espaço na folha do currículo.` }));
  const m = esquemaMestre.parse({
    contato: { nome: "Rafael Campi", email: "rafael@example.com", telefone: "11 99999-0000", cidade: "São Paulo", linkedin: "linkedin.com/in/rafael" },
    resumos: [{ id: "s1", texto: "Desenvolvedor backend com 6 anos de experiência em Python." }],
    experiencias: [
      { id: "e1", empresa: "Alfa Logística", cargo: "Dev Backend", inicio: { mes: 3, ano: 2022 }, fim: "atual", bullets: [{ id: "b1", texto: "Reduzi a latência p95 de 800ms para 220ms." }, ...extras] },
      { id: "e2", empresa: "Beta Commerce", cargo: "Dev Full Stack", inicio: { mes: 1, ano: 2019 }, fim: { mes: 2, ano: 2022 }, bullets: [{ id: "b2", texto: "Construí o checkout em React e Node.js." }] },
    ],
    projetos: [{ id: "p1", nome: "API de reservas", descricao: "Projeto open source." }],
    formacao: [{ id: "f1", instituicao: "USP", curso: "Ciência da Computação", inicio: { mes: 2, ano: 2014 }, fim: { mes: 12, ano: 2018 } }],
    skills: [{ id: "k1", nome: "Python", categoria: "Linguagens" }, { id: "k2", nome: "PostgreSQL", categoria: "Bancos" }],
    idiomas: [{ id: "i1", idioma: "Inglês", nivel: "Avançado" }],
  });
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  return montarCurriculo(m, estadoInicial(m, {
    resumo: "s1",
    experiencias: m.experiencias.map((e) => ({ id: e.id, bullets: ids(e.bullets) })),
    projetos: ["p1"], skills: ["k1", "k2"], cobertura: {}, lacunas: [],
  }));
}

async function textoDoPdf(pdf: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise;
  const partes: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const conteudo = await (await doc.getPage(n)).getTextContent();
    partes.push(conteudo.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : " ") : "")).join(""));
  }
  return partes.join("\n").replace(/[ \t]+/g, " ");
}

describe("htmlDoCurriculo", () => {
  const html = htmlDoCurriculo(curriculo());
  it("leva o conteúdo e as fontes dentro do próprio HTML", () => {
    expect(html).toContain("Rafael Campi");
    expect(html).toContain("<title>Currículo de Rafael Campi</title>");
    expect(html.match(/@font-face/g)).toHaveLength(4);
    expect(html).toContain("data:font/woff2;base64,");
    expect(html).not.toMatch(/url\((?!data:)/); // nada de fonte carregada pela rede
  });
  it("usa as margens de 18 mm do A4 na impressão", () => {
    expect(html).toContain("@page { size: A4; margin: 18mm; }");
  });
});

describe.skipIf(!temChromium)("gerarPdf (Chromium de verdade)", () => {
  it("um currículo curto sai em 1 página A4 e é um PDF válido", async () => {
    const { pdf, paginas } = await gerarPdf(curriculo());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(paginas).toBe(1);
    const doc = await (await import("pdf-lib")).PDFDocument.load(pdf);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]); // A4 em pontos
  }, 60_000);

  it("o texto é extraível, na ordem de leitura certa (critério ATS)", async () => {
    const texto = await textoDoPdf((await gerarPdf(curriculo())).pdf);
    for (const parte of ["Rafael Campi", "rafael@example.com", "Reduzi a latência p95 de 800ms para 220ms.", "São Paulo"]) {
      expect(texto).toContain(parte);
    }
    const pos = (t: string) => texto.indexOf(t);
    const secoes = ["Resumo", "Skills", "Experiência", "Projetos", "Formação", "Idiomas"].map((s) => pos(`${s}\n`) >= 0 ? pos(`${s}\n`) : pos(s));
    expect(secoes.every((p) => p >= 0)).toBe(true);
    expect([...secoes]).toEqual([...secoes].sort((a, b) => a - b)); // Resumo → Skills → Experiência → Projetos → Formação → Idiomas
    // "empresa · cargo" vem antes das datas, e as duas vêm antes dos bullets
    const e = pos("Alfa Logística");
    expect(e).toBeGreaterThan(0);
    expect(pos("Dev Backend")).toBeGreaterThan(e);
    expect(pos("03/2022 – atual")).toBeGreaterThan(pos("Dev Backend"));
    expect(pos("Reduzi a latência")).toBeGreaterThan(pos("03/2022 – atual"));
    expect(pos("Beta Commerce")).toBeGreaterThan(pos("Reduzi a latência"));
  }, 60_000);

  it("conta as páginas do PDF real: mais conteúdo, mais páginas", async () => {
    expect((await gerarPdf(curriculo(25))).paginas).toBe(2);
    expect((await gerarPdf(curriculo(60))).paginas).toBeGreaterThan(2);
  }, 90_000);

  it("a quebra de página não corta um bullet no meio", async () => {
    const texto = await textoDoPdf((await gerarPdf(curriculo(25))).pdf);
    for (let n = 1; n <= 25; n++) {
      const fim = `Atividade de rotina número ${n}, descrevendo uma entrega longa com várias palavras para ocupar espaço na folha do currículo.`;
      expect(texto.replace(/\s+/g, " ")).toContain(fim);
    }
  }, 60_000);
});

describe("contarPaginas", () => {
  it("rejeita o que não é PDF", async () => {
    await expect(contarPaginas(new TextEncoder().encode("não é pdf"))).rejects.toThrow();
  });
});

describe("folhaHtml: o texto do currículo nunca vira marcação", () => {
  it("escapa tudo que o usuário digitou", () => {
    const c = curriculo();
    c.contato.nome = `Rafael <script>alert("x")</script> & Cia`;
    c.resumo = "Fiz <b>negrito</b> e '1 < 2'";
    c.experiencias[0]!.bullets[0] = `<img src=x onerror=alert(1)>`;
    const html = folhaHtml(c);
    expect(html).not.toMatch(/<script|<img|<b>/);
    expect(html).toContain("Rafael &lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
  it("links: sem protocolo vira https, e aspas não escapam do atributo", () => {
    const c = curriculo();
    c.contato.github = `github.com/x" onmouseover="alert(1)`;
    const html = folhaHtml(c);
    expect(html).toContain('href="https://github.com/x&quot; onmouseover=&quot;alert(1)"');
    expect(html).toContain('href="https://linkedin.com/in/rafael"');
  });
});
