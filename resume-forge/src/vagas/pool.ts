import { bancoPronto } from "../db/pool";
import { repositorioMestre } from "../mestre/pool";
import { criarClienteFalso } from "../selecao/falso";
import { criarClienteNvidia } from "../selecao/nvidia";
import { criarRepositorioVagas } from "./repositorio";
import type { DepsAnalise } from "./analisar";

export async function repositorioVagas() {
  return criarRepositorioVagas(await bancoPronto());
}

/** FORGE_IA=falsa usa a IA falsa (offline; FORGE_IA_ATRASO_MS simula a lentidão). Senão, NVIDIA Build: NVIDIA_API_KEY, NVIDIA_MODEL e NVIDIA_TIMEOUT_MS. */
export function criarIaDoAmbiente() {
  if (process.env.FORGE_IA === "falsa") return { cliente: criarClienteFalso(Number(process.env.FORGE_IA_ATRASO_MS) || 0), modelo: "ia-falsa" };
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY não está configurada. Defina em resume-forge/.env.local, ou use FORGE_IA=falsa para testar sem IA.");
  const modelo = process.env.NVIDIA_MODEL ?? "google/gemma-4-31b-it";
  // 180 s por chamada é apertado para este modelo (a spec mediu 236 s num teste ao vivo)
  const timeoutMs = Number(process.env.NVIDIA_TIMEOUT_MS) || 240_000;
  return { cliente: criarClienteNvidia({ apiKey, modelo, timeoutMs }), modelo };
}

export async function depsDeAnalise(): Promise<DepsAnalise> {
  return { vagas: await repositorioVagas(), mestre: await repositorioMestre(), criarIa: criarIaDoAmbiente };
}
