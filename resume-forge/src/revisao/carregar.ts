import type { Mestre } from "../mestre/esquema";
import type { Selecao } from "../selecao/tipos";
import { estadoInicial, reconciliar } from "./estado";
import type { EstadoRevisao } from "./estado";
import { esquemaEstadoRevisao } from "./esquema";

/**
 * O estado a mostrar: o que a pessoa já ajustou, ou a seleção da IA se ainda não ajustou nada
 * (ou se o que está guardado não é legível). Sempre acertado com o mestre de hoje.
 */
export function carregarEstado(guardado: unknown, mestre: Mestre, selecaoIA: Selecao): EstadoRevisao {
  const lido = esquemaEstadoRevisao.safeParse(guardado);
  return reconciliar(lido.success ? lido.data : estadoInicial(mestre, selecaoIA), mestre);
}
