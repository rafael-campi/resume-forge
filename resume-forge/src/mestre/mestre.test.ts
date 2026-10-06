import { describe, expect, it } from "vitest";
import { completude } from "./completude";
import { ESQUEMA_SECAO, esquemaMestre, idsRepetidos, mestreVazio, novoId } from "./esquema";
import type { Mestre } from "./esquema";
import { paraItensMestre } from "./itens";

function mestreCompleto(): Mestre {
  return esquemaMestre.parse({
    contato: { nome: "Fulano de Tal", email: "f@x.com", telefone: "11 9999", cidade: "São Paulo" },
    resumos: [{ id: "s1", texto: "Backend com 6 anos." }],
    experiencias: [
      {
        id: "e1", empresa: "Alfa", cargo: "Dev Backend", inicio: { mes: 3, ano: 2022 }, fim: "atual", tags: ["aws"],
        bullets: [{ id: "b1", texto: "Reduzi a latência.", tags: ["perf"] }, { id: "b2", texto: "  " }],
      },
    ],
    projetos: [{ id: "p1", nome: "API de reservas", descricao: "Open source." }],
    formacao: [{ id: "f1", instituicao: "USP", curso: "Ciência da Computação" }],
    skills: [{ id: "k1", nome: "TypeScript", categoria: "Linguagens" }, { id: "k2", nome: "" }],
    idiomas: [{ id: "i1", idioma: "Inglês", nivel: "Avançado" }],
  });
}

describe("esquema", () => {
  it("aceita rascunhos: tudo em branco é válido e vira o mestre vazio", () => {
    const vazio = mestreVazio();
    expect(vazio.contato.nome).toBe("");
    expect(vazio.experiencias).toEqual([]);
  });

  it("um documento sem contato (só outras seções salvas) ainda é lido", () => {
    expect(esquemaMestre.parse({ skills: [{ id: "k1", nome: "Go" }] }).contato.nome).toBe("");
  });

  it("preenche o que falta com padrões (fim de experiência, tags, sempre visível)", () => {
    const m = esquemaMestre.parse({ contato: {}, experiencias: [{ id: "e1" }] });
    expect(m.experiencias[0]).toMatchObject({ empresa: "", inicio: null, fim: null, bullets: [], tags: [], sempreVisivel: false });
  });

  it("rejeita mês fora de 1 a 12 e item sem ID", () => {
    expect(ESQUEMA_SECAO.experiencias.safeParse([{ id: "e1", inicio: { mes: 13, ano: 2020 } }]).success).toBe(false);
    expect(ESQUEMA_SECAO.skills.safeParse([{ nome: "Go" }]).success).toBe(false);
  });

  it("aceita 'atual' como fim", () => {
    expect(ESQUEMA_SECAO.experiencias.safeParse([{ id: "e1", fim: "atual" }]).success).toBe(true);
    expect(ESQUEMA_SECAO.experiencias.safeParse([{ id: "e1", fim: "hoje" }]).success).toBe(false);
  });

  it("gera IDs únicos com prefixo", () => {
    expect(novoId("b")).toMatch(/^b_[0-9a-f]{8}$/);
    expect(novoId("b")).not.toBe(novoId("b"));
  });

  it("acha IDs repetidos, inclusive entre bullets de experiências diferentes", () => {
    const m = mestreCompleto();
    expect(idsRepetidos(m)).toEqual([]);
    m.experiencias.push({ ...m.experiencias[0]!, id: "e2" });
    expect(idsRepetidos(m.experiencias)).toEqual(expect.arrayContaining(["b1", "b2"]));
  });
});

describe("completude", () => {
  it("mestre vazio: seções obrigatórias pendentes, opcionais completas", () => {
    const c = completude(mestreVazio());
    for (const s of ["contato", "resumos", "experiencias", "formacao", "skills"] as const) {
      expect(c[s]).toMatchObject({ obrigatoria: true, completa: false });
    }
    for (const s of ["projetos", "certificacoes", "idiomas"] as const) {
      expect(c[s]).toMatchObject({ obrigatoria: false, completa: true });
    }
  });

  it("aponta o que falta no contato", () => {
    const m = mestreCompleto();
    m.contato.email = " ";
    expect(completude(m).contato.pendencias).toEqual(["Falta o e-mail."]);
  });

  it("experiência pede empresa, cargo, datas e um bullet com texto", () => {
    const m = esquemaMestre.parse({ contato: {}, experiencias: [{ id: "e1", empresa: "Alfa", bullets: [{ id: "b1", texto: " " }] }] });
    expect(completude(m).experiencias.pendencias).toEqual([
      "Alfa: falta empresa ou cargo.",
      'Alfa: faltam as datas (use "atual" para o emprego em andamento).',
      "Alfa: escreva ao menos um bullet.",
    ]);
  });

  it("skill em branco deixa a seção incompleta, mas ela não some", () => {
    expect(completude(mestreCompleto()).skills).toMatchObject({ completa: false, pendencias: ["Há skills em branco."] });
  });
});

describe("paraItensMestre", () => {
  const itens = paraItensMestre(mestreCompleto());

  it("nunca leva nome nem contato para a IA", () => {
    const texto = JSON.stringify(itens);
    for (const dado of ["Fulano", "f@x.com", "11 9999", "São Paulo"]) expect(texto).not.toContain(dado);
  });

  it("monta o título da experiência com empresa, cargo e período", () => {
    expect(itens.experiencias[0]!.titulo).toBe("Alfa · Dev Backend · 03/2022–atual");
  });

  it("descarta bullets e skills em branco, mantém tags", () => {
    expect(itens.experiencias[0]!.bullets).toEqual([{ id: "b1", texto: "Reduzi a latência.", tags: ["perf"], sempreVisivel: false }]);
    expect(itens.skills.map((s) => s.texto)).toEqual(["TypeScript"]);
    expect(itens.experiencias[0]!.tags).toEqual(["aws"]);
  });

  it("projeto vira 'nome: descrição'", () => {
    expect(itens.projetos[0]!.texto).toBe("API de reservas: Open source.");
  });
});
