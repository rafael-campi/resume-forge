import { describe, expect, it } from "vitest";
import { esquemaMestre } from "../mestre/esquema";
import type { Selecao } from "../selecao/tipos";
import { alternarVisivel, coberturaAtual, estadoInicial, idsVisiveis, moverItem, reconciliar, registrarNovo, usarResumo } from "./estado";
import type { EstadoRevisao } from "./estado";

const mestre = esquemaMestre.parse({
  resumos: [{ id: "s1", texto: "A" }, { id: "s2", texto: "B" }],
  experiencias: [
    { id: "e1", empresa: "Alfa", bullets: [{ id: "b1", texto: "x" }, { id: "b2", texto: "y" }, { id: "b3", texto: "z" }] },
    { id: "e2", empresa: "Beta", bullets: [{ id: "b4", texto: "w" }] },
  ],
  projetos: [{ id: "p1", nome: "P1" }, { id: "p2", nome: "P2" }],
  skills: [{ id: "k1", nome: "K1" }, { id: "k2", nome: "K2" }, { id: "k3", nome: "K3", sempreVisivel: true }],
});
const sel: Selecao = {
  resumo: "s2",
  experiencias: [{ id: "e2", bullets: ["b4"] }, { id: "e1", bullets: ["b2", "b1"] }],
  projetos: ["p2"],
  skills: ["k2"],
  cobertura: { b1: ["r1"], b2: ["r2"], k2: ["r1"] },
  lacunas: ["r3"],
};
const reqs = [{ id: "r1", texto: "A" }, { id: "r2", texto: "B" }, { id: "r3", texto: "C" }];
const inicial = () => estadoInicial(mestre, sel);
const resumoDe = (l: { id: string; visivel: boolean }[]) => l.map((i) => `${i.id}${i.visivel ? "" : "(oculto)"}`);

describe("estadoInicial", () => {
  const e = inicial();
  it("começa pela seleção da IA, na ordem dela, e põe o resto depois, ocultos", () => {
    expect(e.resumo).toBe("s2");
    expect(resumoDe(e.experiencias)).toEqual(["e2", "e1"]);
    expect(resumoDe(e.experiencias[1]!.bullets)).toEqual(["b2", "b1", "b3(oculto)"]);
    expect(resumoDe(e.projetos)).toEqual(["p2", "p1(oculto)"]);
  });
  it("itens 'sempre visível' ficam visíveis mesmo se a IA não os escolheu", () => {
    expect(resumoDe(e.skills)).toEqual(["k2", "k1(oculto)", "k3"]);
  });
  it("não há itens novos nem cobertura manual", () => {
    expect(e.novos).toEqual([]);
    expect(e.coberturaManual).toEqual({});
  });
  it("experiência que a IA não escolheu fica oculta, com os bullets ocultos", () => {
    const so = estadoInicial(mestre, { ...sel, experiencias: [{ id: "e1", bullets: ["b1"] }] });
    expect(resumoDe(so.experiencias)).toEqual(["e1", "e2(oculto)"]);
    expect(resumoDe(so.experiencias[1]!.bullets)).toEqual(["b4(oculto)"]);
  });
  it("ignora IDs que a IA inventou", () => {
    const x = estadoInicial(mestre, { ...sel, skills: ["k2", "zzz"], projetos: ["p2", "p2"] });
    expect(resumoDe(x.skills)).toEqual(["k2", "k1(oculto)", "k3"]);
    expect(resumoDe(x.projetos)).toEqual(["p2", "p1(oculto)"]);
  });
});

describe("reconciliar", () => {
  it("descarta o que sumiu do mestre e põe oculto o que apareceu nele", () => {
    const menor = esquemaMestre.parse({ ...mestre, skills: [{ id: "k2", nome: "K2" }, { id: "k9", nome: "novo no mestre" }], resumos: [{ id: "s1", texto: "A" }] });
    const e = reconciliar(inicial(), menor);
    expect(resumoDe(e.skills)).toEqual(["k2", "k9(oculto)"]);
    expect(e.resumo).toBe("s1"); // s2 foi apagado: cai para o primeiro resumo
  });
  it("restaura 'sempre visível' marcado depois da geração", () => {
    const fixa = esquemaMestre.parse({ ...mestre, projetos: [{ id: "p1", nome: "P1", sempreVisivel: true }, { id: "p2", nome: "P2" }] });
    expect(resumoDe(reconciliar(inicial(), fixa).projetos)).toEqual(["p2", "p1"]);
  });
  it("não muda nada quando o mestre é o mesmo", () => {
    expect(reconciliar(inicial(), mestre)).toEqual(inicial());
  });
});

describe("moverItem", () => {
  it("troca com o vizinho visível, pulando os ocultos", () => {
    let e = inicial();
    e = alternarVisivel(e, { tipo: "skill", id: "k1" }, mestre); // k1 visível: [k2, k1, k3]
    e = alternarVisivel(e, { tipo: "skill", id: "k1" }, mestre); // oculto de novo
    expect(idsVisiveis(moverItem(e, { tipo: "skill", id: "k3" }, -1).skills)).toEqual(["k3", "k2"]);
  });
  it("não faz nada na ponta da lista", () => {
    const e = inicial();
    expect(moverItem(e, { tipo: "experiencia", id: "e2" }, -1)).toEqual(e);
    expect(moverItem(e, { tipo: "bullet", experienciaId: "e1", id: "b1" }, 1)).toEqual(e); // b3 está oculto: b1 é o último visível
  });
  it("move bullets só dentro da própria experiência", () => {
    const e = moverItem(inicial(), { tipo: "bullet", experienciaId: "e1", id: "b1" }, -1);
    expect(idsVisiveis(e.experiencias.find((x) => x.id === "e1")!.bullets)).toEqual(["b1", "b2"]);
    expect(idsVisiveis(e.experiencias.find((x) => x.id === "e2")!.bullets)).toEqual(["b4"]);
  });
  it("move experiências", () => {
    expect(idsVisiveis(moverItem(inicial(), { tipo: "experiencia", id: "e1" }, -1).experiencias)).toEqual(["e1", "e2"]);
  });
});

describe("alternarVisivel", () => {
  it("oculta e mostra de novo, mantendo a posição", () => {
    const antes = inicial();
    const oculto = alternarVisivel(antes, { tipo: "projeto", id: "p2" }, mestre);
    expect(resumoDe(oculto.projetos)).toEqual(["p2(oculto)", "p1(oculto)"]);
    expect(alternarVisivel(oculto, { tipo: "projeto", id: "p2" }, mestre)).toEqual(antes);
  });
  it("não oculta item 'sempre visível'", () => {
    const e = inicial();
    expect(alternarVisivel(e, { tipo: "skill", id: "k3" }, mestre)).toEqual(e);
  });
  it("ocultar a experiência preserva a escolha dos bullets", () => {
    const e = alternarVisivel(inicial(), { tipo: "experiencia", id: "e1" }, mestre);
    expect(e.experiencias.find((x) => x.id === "e1")!.visivel).toBe(false);
    expect(idsVisiveis(e.experiencias.find((x) => x.id === "e1")!.bullets)).toEqual(["b2", "b1"]);
  });
});

describe("usarResumo", () => {
  it("troca a versão do resumo", () => expect(usarResumo(inicial(), "s1").resumo).toBe("s1"));
});

describe("registrarNovo", () => {
  it("o bullet entra visível logo depois do último visível, só naquela experiência", () => {
    const e = registrarNovo(inicial(), { tipo: "bullet", experienciaId: "e1", id: "bN" });
    expect(resumoDe(e.experiencias.find((x) => x.id === "e1")!.bullets)).toEqual(["b2", "b1", "bN", "b3(oculto)"]);
    expect(e.novos).toEqual(["bN"]);
  });
  it("guarda o requisito da lacuna para a qual foi criado", () => {
    const e = registrarNovo(inicial(), { tipo: "skill", id: "kN", requisitoId: "r3" });
    expect(e.coberturaManual).toEqual({ kN: ["r3"] });
    expect(idsVisiveis(e.skills)).toEqual(["k2", "k3", "kN"]); // depois do último visível (k3 é fixo)
  });
  it("entra no começo quando não há nenhum visível", () => {
    const vazio = { ...inicial(), projetos: [{ id: "p1", visivel: false }] };
    expect(resumoDe(registrarNovo(vazio, { tipo: "projeto", id: "pN" }).projetos)).toEqual(["pN", "p1(oculto)"]);
  });
});

describe("coberturaAtual", () => {
  const itens = (e: EstadoRevisao) => coberturaAtual(e, reqs, sel.cobertura).map((c) => c.itens);
  it("conta os itens visíveis que cobrem cada requisito", () => {
    expect(itens(inicial())).toEqual([2, 1, 0]); // r1: b1 e k2; r2: b2; r3: lacuna
  });
  it("ocultar o único item que cobre um requisito cria uma lacuna", () => {
    expect(itens(alternarVisivel(inicial(), { tipo: "bullet", experienciaId: "e1", id: "b2" }, mestre))).toEqual([2, 0, 0]);
  });
  it("ocultar a experiência tira a cobertura dos bullets dela", () => {
    expect(itens(alternarVisivel(inicial(), { tipo: "experiencia", id: "e1" }, mestre))).toEqual([1, 0, 0]);
  });
  it("um item criado para uma lacuna a cobre", () => {
    expect(itens(registrarNovo(inicial(), { tipo: "bullet", experienciaId: "e1", id: "bN", requisitoId: "r3" }))).toEqual([2, 1, 1]);
  });
});
