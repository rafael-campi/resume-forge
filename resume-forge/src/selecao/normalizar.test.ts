import { describe, expect, it } from "vitest";
import { itens, requisitos, selecaoBoa } from "./fixtures";
import { normalizarRequisitos, normalizarSelecao } from "./normalizar";

const ok = (bruto: unknown, it = itens) => {
  const r = normalizarSelecao(bruto, it, requisitos);
  if (!r.ok) throw new Error("esperava ok: " + r.erros.join("; "));
  return r;
};

describe("normalizarSelecao", () => {
  it("aceita uma saída válida sem ajustes e preserva a ordem", () => {
    const r = ok(selecaoBoa);
    expect(r.ajustes).toEqual([]);
    expect(r.selecao.experiencias).toEqual([{ id: "e1", bullets: ["b2", "b1"] }]);
    expect(r.selecao.lacunas).toEqual(["r3"]);
  });

  it("remove IDs inexistentes e duplicatas sem pedir nova tentativa", () => {
    const r = ok({ ...selecaoBoa, skills: ["k1", "k1", "k99"], projetos: ["p9", "p1"], experiencias: [{ id: "e1", bullets: ["b1", "b99", "b1"] }, { id: "e7", bullets: [] }] });
    expect(r.selecao.skills).toEqual(["k1"]);
    expect(r.selecao.projetos).toEqual(["p1"]);
    expect(r.selecao.experiencias).toEqual([{ id: "e1", bullets: ["b1"] }]);
    expect(r.ajustes.length).toBeGreaterThanOrEqual(4);
  });

  it("descarta bullet colocado na experiência errada", () => {
    const r = ok({ ...selecaoBoa, experiencias: [{ id: "e2", bullets: ["b1", "b5"] }] });
    expect(r.selecao.experiencias).toEqual([{ id: "e2", bullets: ["b5"] }]);
    expect(r.ajustes.join()).toContain("b1");
  });

  it("recalcula as lacunas pela cobertura, mesmo que a IA declare outras", () => {
    const r = ok({ ...selecaoBoa, lacunas: [] });
    expect(r.selecao.lacunas).toEqual(["r3"]);
    expect(r.ajustes).toContain("lacunas recalculadas a partir da cobertura");
  });

  it("não deixa a cobertura de um item oculto fechar uma lacuna", () => {
    const r = ok({ ...selecaoBoa, cobertura: { ...selecaoBoa.cobertura, p2: ["r3"] } });
    expect(r.selecao.cobertura.p2).toBeUndefined();
    expect(r.selecao.lacunas).toEqual(["r3"]);
  });

  it("ignora requisitos inventados na cobertura", () => {
    const r = ok({ ...selecaoBoa, cobertura: { b1: ["r1", "r42"] } });
    expect(r.selecao.cobertura.b1).toEqual(["r1"]);
  });

  it("insere itens sempre visíveis que a IA omitiu", () => {
    const fixos = structuredClone(itens);
    fixos.skills[2]!.sempreVisivel = true;
    fixos.experiencias[1]!.sempreVisivel = true;
    fixos.experiencias[0]!.bullets[1]!.sempreVisivel = true;
    const r = ok({ ...selecaoBoa, experiencias: [{ id: "e1", bullets: ["b1"] }] }, fixos);
    expect(r.selecao.skills).toEqual(["k3", "k1", "k2"]);
    expect(r.selecao.experiencias.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(r.selecao.experiencias.find((e) => e.id === "e1")!.bullets).toEqual(["b2", "b1"]);
  });

  it("pede nova tentativa quando o resumo não existe, citando os IDs válidos", () => {
    const r = normalizarSelecao({ ...selecaoBoa, resumo: "Desenvolvedor backend..." }, itens, requisitos);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toContain("s1, s2");
  });

  it.each([null, "texto", [], { resumo: "s1" }, { ...selecaoBoa, skills: "k1" }])("rejeita formato quebrado: %j", (bruto) => {
    expect(normalizarSelecao(bruto, itens, requisitos).ok).toBe(false);
  });

  it("não altera o objeto recebido", () => {
    const entrada = structuredClone(selecaoBoa);
    ok({ ...entrada, skills: ["k1", "k1"] });
    expect(entrada).toEqual(selecaoBoa);
  });
});

describe("normalizarRequisitos", () => {
  it("aceita requisitos e apara o texto", () => {
    const r = normalizarRequisitos({ requisitos: [{ id: "r1", texto: " Node.js " }] });
    expect(r).toEqual({ ok: true, requisitos: [{ id: "r1", texto: "Node.js" }] });
  });
  it.each([null, {}, { requisitos: [] }, { requisitos: [{ id: "r1" }] }, { requisitos: [{ id: "r1", texto: "a" }, { id: "r1", texto: "b" }] }])("rejeita %j", (bruto) => {
    expect(normalizarRequisitos(bruto).ok).toBe(false);
  });
});
