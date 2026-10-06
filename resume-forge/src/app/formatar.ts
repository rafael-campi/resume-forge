import type { Status } from "../candidaturas/tipos";

export const ROTULO: Record<Status, string> = {
  vista: "Vista",
  filtrada: "Filtrada",
  formulario_aberto: "Formulário aberto",
  enviada: "Enviada",
  falhou: "Falhou",
  revisao_manual: "Revisão manual",
};

const dataHora = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const formatarDataHora = (d: Date) => dataHora.format(d);

/** "agora", "há 5 min", "há 3 h", "há 2 dias" */
export function haQuanto(d: Date, agora = new Date()): string {
  const min = Math.max(0, Math.round((agora.getTime() - d.getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 60 * 24) return `há ${Math.round(min / 60)} h`;
  const dias = Math.round(min / (60 * 24));
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
