import { ErroIA } from "./tipos";
import type { ClienteIA, PedidoJson } from "./tipos";

export type OpcoesNvidia = {
  apiKey: string;
  /** Vem de configuração: a lista de modelos da NVIDIA muda (o Llama 3.3 70B foi desativado em 2026-08). */
  modelo: string;
  baseUrl?: string;
  maxTokens?: number;
  temperatura?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

/** Cliente da NVIDIA Build com `response_format: json_schema` (o `nvext.guided_json` é rejeitado). */
export function criarClienteNvidia(op: OpcoesNvidia): ClienteIA {
  const url = op.baseUrl ?? "https://integrate.api.nvidia.com/v1/chat/completions";
  const chamar = op.fetch ?? fetch;
  return {
    async completarJson({ sistema, usuario, schema }: PedidoJson) {
      let res: Response;
      try {
        res = await chamar(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${op.apiKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(op.timeoutMs ?? 180_000),
          body: JSON.stringify({
            model: op.modelo,
            temperature: op.temperatura ?? 0.1,
            max_tokens: op.maxTokens ?? 4096,
            stream: false,
            messages: [
              { role: "system", content: sistema },
              { role: "user", content: usuario },
            ],
            response_format: { type: "json_schema", json_schema: { name: "saida", schema, strict: true } },
          }),
        });
      } catch (e) {
        throw new ErroIA(`Falha de rede ou tempo esgotado ao chamar a IA: ${(e as Error).message}`, "servico");
      }
      const texto = await res.text();
      if (!res.ok) throw new ErroIA(`A IA respondeu HTTP ${res.status}: ${texto.slice(0, 300)}`, "servico");

      let conteudo: unknown, fim: unknown;
      try {
        const escolha = JSON.parse(texto).choices[0];
        conteudo = escolha.message.content;
        fim = escolha.finish_reason;
      } catch {
        throw new ErroIA("A resposta da IA não segue o formato esperado.", "saida");
      }
      if (typeof conteudo !== "string" || !conteudo.trim()) {
        throw new ErroIA(`A IA devolveu conteúdo vazio (finish_reason=${String(fim)}). Modelos de raciocínio podem gastar todos os tokens pensando.`, "saida");
      }
      try {
        return JSON.parse(conteudo.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
      } catch {
        throw new ErroIA(`A IA devolveu JSON inválido: ${conteudo.slice(0, 200)}`, "saida");
      }
    },
  };
}
