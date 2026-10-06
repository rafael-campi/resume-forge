import { describe, expect, it } from "vitest";
import { criarClienteNvidia } from "./nvidia";
import { ErroIA } from "./tipos";

const pedido = { sistema: "s", usuario: "u", schema: { type: "object" } };
const resposta = (corpo: unknown, status = 200) => async () => new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), { status });
const completar = (content: unknown, finish = "stop") => ({ choices: [{ message: { content }, finish_reason: finish }] });
const falha = async (p: Promise<unknown>) => (await p.then(() => null, (x: unknown) => x)) as ErroIA;
const cliente = (f: typeof fetch) => criarClienteNvidia({ apiKey: "chave-falsa", modelo: "m", fetch: f });

describe("cliente da NVIDIA", () => {
  it("envia response_format json_schema, o modelo e a chave, e lê o JSON", async () => {
    let enviado: { url: string; init: RequestInit } | undefined;
    const f = (async (url: string, init: RequestInit) => {
      enviado = { url, init };
      return new Response(JSON.stringify(completar('{"a":1}')));
    }) as unknown as typeof fetch;
    expect(await cliente(f).completarJson(pedido)).toEqual({ a: 1 });
    const corpo = JSON.parse(enviado!.init.body as string);
    expect(corpo.model).toBe("m");
    expect(corpo.response_format.type).toBe("json_schema");
    expect(corpo.nvext).toBeUndefined(); // guided_json é rejeitado pelo endpoint hospedado
    expect((enviado!.init.headers as Record<string, string>).Authorization).toBe("Bearer chave-falsa");
  });

  it("aceita JSON dentro de cerca de código", async () => {
    expect(await cliente(resposta(completar('```json\n{"a":1}\n```')) as never).completarJson(pedido)).toEqual({ a: 1 });
  });

  it.each([
    ["conteúdo vazio", completar(null, "length")],
    ["conteúdo em branco", completar("   ")],
    ["JSON inválido", completar("não é json")],
    ["formato fora do padrão", { foo: 1 }],
  ])("trata %s como saída inutilizável", async (_n, corpo) => {
    const e = await falha(cliente(resposta(corpo) as never).completarJson(pedido));
    expect(e).toBeInstanceOf(ErroIA);
    expect(e.tipo).toBe("saida");
  });

  it.each([410, 429, 500, 529])("trata HTTP %i como erro de serviço", async (status) => {
    const e = await falha(cliente(resposta("erro", status) as never).completarJson(pedido));
    expect(e).toBeInstanceOf(ErroIA);
    expect(e.tipo).toBe("servico");
    expect(e.message).toContain(String(status));
  });

  it("trata falha de rede como erro de serviço", async () => {
    const f = (async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
    const e = await falha(cliente(f).completarJson(pedido));
    expect(e.tipo).toBe("servico");
  });
});
