// Leitura das Candidaturas do bot (apply-jobs). O bot é dono das tabelas; aqui só se lê.

/** Os Status do bot (apply-jobs/bot/domain/status.py), na ordem do funil. */
export const STATUS = ["vista", "filtrada", "formulario_aberto", "enviada", "falhou", "revisao_manual"] as const;
export type Status = (typeof STATUS)[number];

export function lerStatus(valor: string): Status {
  if ((STATUS as readonly string[]).includes(valor)) return valor as Status;
  throw new Error(`Status desconhecido no banco: "${valor}". O bot ganhou um Status novo? Atualize STATUS em src/candidaturas/tipos.ts.`);
}

export type Candidatura = {
  jobId: string;
  titulo: string;
  empresa: string;
  local: string;
  status: Status;
  atualizadaEm: Date;
};

export type Evento = { status: Status; em: Date };
export type DetalheCandidatura = Candidatura & { descricao: string; historico: Evento[] };

export type Resumo = Record<Status, number>;
export type Filtro = { status?: Status; busca?: string; limite?: number };
export type Listagem = { linhas: Candidatura[]; total: number };
