import { describe, expect, it } from "vitest";
import { esquemaMestre } from "../mestre/esquema";
import { alternarVisivel, estadoInicial } from "../revisao/estado";
import type { Selecao } from "../selecao/tipos";
import { montarCurriculo, periodo } from "./montar";

const mestre = esquemaMestre.parse({
  contato: { nome: "Fulano", email: "f@x.com" },
  resumos: [{ id: "s1", texto: "Backend." }],
  experiencias: [
    { id: "e1", empresa: "Alfa", cargo: "Dev", inicio: { mes: 3, ano: 2022 }, fim: "atual", bullets: [{ id: "b1", texto: "Um." }, { id: "b2", texto: "Dois." }, { id: "b3", texto: "Três." }] },
    { id: "e2", empresa: "Beta", cargo: "Jr", inicio: { mes: 1, ano: 2019 }, fim: { mes: 2, ano: 2022 }, bullets: [{ id: "b4", texto: "Quatro." }] },
  ],
  projetos: [{ id: "p1", nome: "API", descricao: "Open source." }],
  formacao: [{ id: "f1", instituicao: "USP", curso: "Ciência da Computação", inicio: { mes: 2, ano: 2014 }, fim: { mes: 12, ano: 2018 } }],
  skills: [
    { id: "k1", nome: "Python", categoria: "Linguagens" },
    { id: "k2", nome: "Docker" },
    { id: "k3", nome: "TypeScript", categoria: "Linguagens" },
    { id: "k4", nome: "AWS", categoria: "Cloud" },
  ],
  idiomas: [{ id: "i1", idioma: "Inglês", nivel: "Avançado" }],
});
const sel: Selecao = {
  resumo: "s1",
  experiencias: [{ id: "e1", bullets: ["b2", "b1"] }],
  projetos: ["p1"],
  skills: ["k2", "k1", "k4", "k3"],
  cobertura: {},
  lacunas: [],
};
const estado = () => estadoInicial(mestre, sel);

describe("montarCurriculo", () => {
  const c = montarCurriculo(mestre, estado());
  it("mostra só o que está visível, na ordem escolhida", () => {
    expect(c.experiencias).toEqual([{ empresa: "Alfa", cargo: "Dev", periodo: "03/2022 – atual", bullets: ["Dois.", "Um."] }]);
    expect(c.projetos).toEqual([{ nome: "API", descricao: "Open source.", link: "" }]);
    expect(c.resumo).toBe("Backend.");
  });
  it("agrupa skills por categoria na ordem de escolha, com 'Outras' no fim", () => {
    expect(c.skills).toEqual([
      { categoria: "Linguagens", nomes: ["Python", "TypeScript"] },
      { categoria: "Cloud", nomes: ["AWS"] },
      { categoria: "Outras", nomes: ["Docker"] },
    ]);
  });
  it("formação e idiomas sempre aparecem", () => {
    expect(c.formacao).toEqual([{ instituicao: "USP", curso: "Ciência da Computação", periodo: "02/2014 – 12/2018" }]);
    expect(c.idiomas).toEqual([{ idioma: "Inglês", nivel: "Avançado" }]);
  });
  it("ocultar uma experiência a tira do currículo", () => {
    expect(montarCurriculo(mestre, alternarVisivel(estado(), { tipo: "experiencia", id: "e1" }, mestre)).experiencias).toEqual([]);
  });
  it("não leva itens ocultos nem em branco", () => {
    const so = montarCurriculo(mestre, alternarVisivel(estado(), { tipo: "bullet", experienciaId: "e1", id: "b2" }, mestre));
    expect(so.experiencias[0]!.bullets).toEqual(["Um."]);
  });
});

describe("periodo", () => {
  it("formata mês/ano, com 'atual'", () => {
    expect(periodo({ mes: 3, ano: 2022 }, "atual")).toBe("03/2022 – atual");
    expect(periodo(null, "atual")).toBe("");
    expect(periodo({ mes: 3, ano: 2022 }, null)).toBe("03/2022 –");
  });
});
