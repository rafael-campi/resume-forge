import { describe, expect, it } from "vitest";
import { esquemaMestre } from "../mestre/esquema";
import type { Selecao } from "../selecao/tipos";
import { coberturaPorRequisito, resolverSelecao } from "./resolver";

const mestre = esquemaMestre.parse({
  resumos: [{ id: "s1", texto: "Backend." }],
  experiencias: [{ id: "e1", empresa: "Alfa", cargo: "Dev", inicio: { mes: 3, ano: 2022 }, fim: "atual", bullets: [{ id: "b1", texto: "Reduzi a latência." }] }],
  projetos: [{ id: "p1", nome: "API", descricao: "Open source." }],
  skills: [{ id: "k1", nome: "TypeScript" }],
});
const sel: Selecao = {
  resumo: "s1",
  experiencias: [{ id: "e1", bullets: ["b1", "b9"] }, { id: "e9", bullets: [] }],
  projetos: ["p1"],
  skills: ["k1", "k9"],
  cobertura: { b1: ["r1"], k1: ["r1"] },
  lacunas: ["r2"],
};

describe("resolverSelecao", () => {
  const r = resolverSelecao(sel, mestre);
  it("traduz IDs para o texto do mestre, na ordem da IA", () => {
    expect(r.resumo).toEqual({ id: "s1", texto: "Backend." });
    expect(r.experiencias[0]).toMatchObject({ titulo: "Alfa, Dev (03/2022 a atual)" });
    expect(r.projetos[0]!.texto).toBe("API: Open source.");
    expect(r.skills[0]!.texto).toBe("TypeScript");
  });
  it("marca com null o que foi removido do mestre depois da geração", () => {
    expect(r.experiencias[0]!.bullets.map((b) => b.texto)).toEqual(["Reduzi a latência.", null]);
    expect(r.experiencias[1]!.titulo).toBeNull();
    expect(r.skills[1]!.texto).toBeNull();
  });
});

describe("coberturaPorRequisito", () => {
  it("conta os itens que cobrem cada requisito; zero é lacuna", () => {
    const c = coberturaPorRequisito([{ id: "r1", texto: "A" }, { id: "r2", texto: "B" }], sel);
    expect(c.map((x) => x.itens)).toEqual([2, 0]);
  });
});
