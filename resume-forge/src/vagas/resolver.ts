import { formatarMesAno } from "../mestre/completude";
import type { Mestre } from "../mestre/esquema";
import type { Requisito, Selecao } from "../selecao/tipos";

/** Texto de um item que a IA escolheu, ou null se o item foi removido do mestre depois da geração. */
export type ItemResolvido = { id: string; texto: string | null };
export type SelecaoResolvida = {
  resumo: ItemResolvido;
  experiencias: { id: string; titulo: string | null; bullets: ItemResolvido[] }[];
  projetos: ItemResolvido[];
  skills: ItemResolvido[];
};

const achar = (itens: { id: string }[], id: string, texto: (x: any) => string): ItemResolvido => {
  const item = itens.find((x) => x.id === id);
  return { id, texto: item ? texto(item) : null };
};

/** Traduz os IDs da seleção para o texto atual do mestre, na ordem que a IA escolheu. */
export function resolverSelecao(sel: Selecao, m: Mestre): SelecaoResolvida {
  return {
    resumo: achar(m.resumos, sel.resumo, (r) => r.texto),
    experiencias: sel.experiencias.map((e) => {
      const exp = m.experiencias.find((x) => x.id === e.id);
      const periodo = exp?.inicio ? ` (${formatarMesAno(exp.inicio)} a ${exp.fim === "atual" ? "atual" : exp.fim ? formatarMesAno(exp.fim) : "?"})` : "";
      return {
        id: e.id,
        titulo: exp ? `${exp.empresa}, ${exp.cargo}${periodo}` : null,
        bullets: e.bullets.map((b) => achar(exp?.bullets ?? [], b, (x) => x.texto)),
      };
    }),
    projetos: sel.projetos.map((id) => achar(m.projetos, id, (p) => (p.descricao ? `${p.nome}: ${p.descricao}` : p.nome))),
    skills: sel.skills.map((id) => achar(m.skills, id, (s) => s.nome)),
  };
}

/** Para cada requisito, quantos itens mostrados o cobrem. Zero é uma lacuna. */
export function coberturaPorRequisito(requisitos: Requisito[], sel: Selecao): { requisito: Requisito; itens: number }[] {
  return requisitos.map((requisito) => ({
    requisito,
    itens: Object.values(sel.cobertura).filter((ids) => ids.includes(requisito.id)).length,
  }));
}
