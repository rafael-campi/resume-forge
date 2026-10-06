// Teste opcional contra a API real: NVIDIA_VIVO=1 npm test -- vivo
// Lê NVIDIA_API_KEY de .env/.env.local. Só envia dados inventados. Pode levar mais de 1 minuto.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { itens } from "./fixtures";
import { criarClienteNvidia } from "./nvidia";
import { extrairRequisitos, selecionar } from "./selecao";

function chave(): string | undefined {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  for (const arq of [".env.local", ".env"]) {
    if (!existsSync(arq)) continue;
    const m = readFileSync(arq, "utf8").match(/^\s*(?:export\s+)?NVIDIA_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1]!.replace(/^["']|["']$/g, "");
  }
}

const VAGA = `Buscamos pessoa engenheira de plataforma sênior.
Requisitos:
- Node.js e TypeScript em APIs REST
- AWS (ECS, Lambda)
- Kubernetes em produção
- Terraform e infraestrutura como código`;

describe.skipIf(!process.env.NVIDIA_VIVO)("NVIDIA ao vivo", () => {
  it("extrai requisitos e seleciona com IDs válidos, apontando as lacunas", async () => {
    const apiKey = chave();
    if (!apiKey) throw new Error("sem NVIDIA_API_KEY");
    const cliente = criarClienteNvidia({ apiKey, modelo: process.env.NVIDIA_MODEL ?? "google/gemma-4-31b-it" });
    const requisitos = await extrairRequisitos(cliente, VAGA);
    const { selecao, ajustes } = await selecionar(cliente, requisitos, itens);
    console.log("requisitos:", requisitos.map((r) => `${r.id}=${r.texto}`).join(" | "));
    console.log("seleção:", JSON.stringify(selecao));
    console.log("ajustes feitos pelo código:", ajustes);
    expect(requisitos.length).toBeGreaterThanOrEqual(3);
    expect(itens.resumos.map((r) => r.id)).toContain(selecao.resumo);
    expect(selecao.lacunas.length).toBeGreaterThan(0); // Kubernetes e Terraform não estão no mestre
  }, 280_000);
});
