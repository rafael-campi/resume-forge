import { describe, expect, it } from "vitest";
import { itens, requisitos, selecaoBoa } from "./fixtures";
import { extrairRequisitos, selecionar } from "./selecao";
import { ErroIA, ErroSelecao } from "./tipos";
import type { ClienteIA, PedidoJson } from "./tipos";

/** Cliente falso: devolve (ou lança) as respostas em sequência e guarda os pedidos recebidos. */
function falso(...respostas: (unknown | Error)[]): ClienteIA & { pedidos: PedidoJson[] } {
  const pedidos: PedidoJson[] = [];
  return {
    pedidos,
    async completarJson(p) {
      pedidos.push(p);
      const r = respostas[Math.min(pedidos.length - 1, respostas.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    },
  };
}

describe("extrairRequisitos", () => {
  it("devolve os requisitos da primeira resposta válida", async () => {
    const c = falso({ requisitos: [{ id: "r1", texto: "Node.js" }] });
    expect(await extrairRequisitos(c, "vaga")).toEqual([{ id: "r1", texto: "Node.js" }]);
    expect(c.pedidos).toHaveLength(1);
    expect(c.pedidos[0]!.usuario).toContain("vaga");
  });

  it("tenta de novo devolvendo o erro ao modelo", async () => {
    const c = falso({ requisitos: [] }, { requisitos: [{ id: "r1", texto: "Node.js" }] });
    await extrairRequisitos(c, "vaga");
    expect(c.pedidos).toHaveLength(2);
    expect(c.pedidos[1]!.usuario).toContain("não vazia");
  });
});

describe("selecionar", () => {
  it("normaliza a saída e devolve os ajustes feitos", async () => {
    const c = falso({ ...selecaoBoa, skills: ["k1", "k1"] });
    const { selecao, ajustes } = await selecionar(c, requisitos, itens);
    expect(selecao.skills).toEqual(["k1"]);
    expect(ajustes.length).toBeGreaterThan(0);
  });

  it("não envia itens sempre visíveis à IA", async () => {
    const fixos = structuredClone(itens);
    fixos.skills[2]!.sempreVisivel = true;
    const c = falso(selecaoBoa);
    await selecionar(c, requisitos, fixos);
    expect(c.pedidos[0]!.usuario).not.toContain("Python");
  });

  it("tenta de novo quando o resumo é inválido e corrige na segunda", async () => {
    const c = falso({ ...selecaoBoa, resumo: "nada" }, selecaoBoa);
    const { selecao } = await selecionar(c, requisitos, itens);
    expect(selecao.resumo).toBe("s1");
    expect(c.pedidos[1]!.usuario).toContain("resumo inexistente");
  });

  it("tenta de novo quando a IA devolve saída inutilizável (vazio, JSON inválido)", async () => {
    const c = falso(new ErroIA("conteúdo vazio", "saida"), selecaoBoa);
    await selecionar(c, requisitos, itens);
    expect(c.pedidos).toHaveLength(2);
    expect(c.pedidos[1]!.usuario).toContain("conteúdo vazio");
  });

  it("desiste depois de 1 + 2 tentativas, sem PDF parcial, com os erros", async () => {
    const c = falso({ resumo: "nada" });
    const e = await selecionar(c, requisitos, itens).catch((x) => x);
    expect(e).toBeInstanceOf(ErroSelecao);
    expect(e.erros.length).toBeGreaterThan(0);
    expect(c.pedidos).toHaveLength(3);
  });

  it("não repete a chamada em erro de serviço", async () => {
    const c = falso(new ErroIA("HTTP 529", "servico"));
    await expect(selecionar(c, requisitos, itens)).rejects.toThrow("HTTP 529");
    expect(c.pedidos).toHaveLength(1);
  });
});
