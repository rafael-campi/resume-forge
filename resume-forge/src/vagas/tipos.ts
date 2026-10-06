import type { Requisito, Selecao } from "../selecao/tipos";

export type EstadoVaga = "analisando" | "pronta" | "erro";
export type EtapaAnalise = "requisitos" | "selecao";

export type ResumoVaga = { id: number; titulo: string; empresa: string; estado: EstadoVaga; criadaEm: Date };

export type Geracao = { id: number; numero: number; selecao: Selecao; ajustes: string[]; modelo: string; criadaEm: Date };

export type DetalheVaga = ResumoVaga & {
  texto: string;
  jobId: string | null;
  etapa: EtapaAnalise | null;
  erro: string | null;
  requisitos: Requisito[] | null;
  /** Estava "analisando" há tempo demais: o processo que analisava provavelmente caiu. */
  interrompida: boolean;
  /** A geração mais recente, se houver. */
  geracao: Geracao | null;
};

export type NovaVaga = { titulo: string; empresa: string; texto: string; jobId: string | null };

/** Aceita o job id puro ou um link do LinkedIn (".../jobs/view/123456/" ou "?currentJobId=123456"). */
export function extrairJobId(entrada: string): string | null {
  const t = entrada.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return t;
  return /\/jobs\/view\/(?:[^/?#]*-)?(\d+)/.exec(t)?.[1] ?? /[?&]currentJobId=(\d+)/.exec(t)?.[1] ?? null;
}
