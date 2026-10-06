// Estado da Revisão: a seleção da IA mais os ajustes da pessoa (spec, seções 6 e 8).
// Cada lista cobre TODOS os itens do mestre daquela seção, na ordem de exibição, com a marca de visível.
// Itens ocultos continuam na lista: assim, ocultar e mostrar de novo não perde a posição nem as escolhas.
// Tudo aqui é puro (sem banco nem React) e roda no servidor e no navegador.
import type { Mestre } from "../mestre/esquema";
import type { Requisito, Selecao } from "../selecao/tipos";

export type ItemEstado = { id: string; visivel: boolean };
export type ExperienciaEstado = ItemEstado & { bullets: ItemEstado[] };

export type EstadoRevisao = {
  /** ID da versão de resumo em uso. */
  resumo: string;
  experiencias: ExperienciaEstado[];
  projetos: ItemEstado[];
  skills: ItemEstado[];
  /** IDs criados na própria Revisão: "novo, a IA ainda não viu". */
  novos: string[];
  /** Item criado a partir de uma lacuna → requisitos que a pessoa disse que ele cobre. */
  coberturaManual: Record<string, string[]>;
};

export type Ref =
  | { tipo: "experiencia" | "projeto" | "skill"; id: string }
  | { tipo: "bullet"; experienciaId: string; id: string };

type Fixavel = { id: string; sempreVisivel: boolean };

/** Escolhidos (na ordem da IA) primeiro, depois o resto na ordem do mestre. Itens "sempre visível" nunca ficam ocultos. */
function montarLista(todos: Fixavel[], escolhidos: string[]): ItemEstado[] {
  const existentes = new Set(todos.map((t) => t.id));
  const vis = escolhidos.filter((id, i) => existentes.has(id) && escolhidos.indexOf(id) === i);
  const resto = todos.filter((t) => !vis.includes(t.id));
  return [
    ...vis.map((id) => ({ id, visivel: true })),
    ...resto.map((t) => ({ id: t.id, visivel: t.sempreVisivel })),
  ];
}

export function estadoInicial(m: Mestre, sel: Selecao): EstadoRevisao {
  const escolhida = (id: string) => sel.experiencias.find((e) => e.id === id);
  const ordemExp = montarLista(m.experiencias, sel.experiencias.map((e) => e.id));
  return {
    resumo: m.resumos.some((r) => r.id === sel.resumo) ? sel.resumo : (m.resumos[0]?.id ?? ""),
    experiencias: ordemExp.map((e) => {
      const exp = m.experiencias.find((x) => x.id === e.id)!;
      return { ...e, bullets: montarLista(exp.bullets, escolhida(e.id)?.bullets ?? []) };
    }),
    projetos: montarLista(m.projetos, sel.projetos),
    skills: montarLista(m.skills, sel.skills),
    novos: [],
    coberturaManual: {},
  };
}

/**
 * Acerta um estado guardado com o mestre de hoje: some o que foi apagado do mestre, o que foi
 * criado no mestre depois entra oculto, e o que é "sempre visível" volta a ficar visível.
 */
export function reconciliar(e: EstadoRevisao, m: Mestre): EstadoRevisao {
  const lista = (atual: ItemEstado[], todos: Fixavel[]): ItemEstado[] => {
    const por = new Map(todos.map((t) => [t.id, t]));
    const mantidos = atual.filter((i) => por.has(i.id)).map((i) => ({ id: i.id, visivel: i.visivel || por.get(i.id)!.sempreVisivel }));
    const novos = todos.filter((t) => !mantidos.some((i) => i.id === t.id)).map((t) => ({ id: t.id, visivel: t.sempreVisivel }));
    return [...mantidos, ...novos];
  };
  const exps = lista(e.experiencias, m.experiencias).map((i) => {
    const exp = m.experiencias.find((x) => x.id === i.id)!;
    const antes = e.experiencias.find((x) => x.id === i.id)?.bullets ?? [];
    return { ...i, bullets: lista(antes, exp.bullets) };
  });
  return {
    ...e,
    resumo: m.resumos.some((r) => r.id === e.resumo) ? e.resumo : (m.resumos[0]?.id ?? ""),
    experiencias: exps,
    projetos: lista(e.projetos, m.projetos),
    skills: lista(e.skills, m.skills),
  };
}

function trocar<T>(lista: T[], a: number, b: number): T[] {
  const copia = [...lista];
  [copia[a], copia[b]] = [copia[b]!, copia[a]!];
  return copia;
}

/** Sobe (-1) ou desce (+1) um item entre os itens VISÍVEIS: os ocultos não contam como vizinhos. */
function moverNaLista(lista: ItemEstado[], id: string, delta: -1 | 1): ItemEstado[] {
  const visiveis = lista.map((x, idx) => ({ x, idx })).filter((v) => v.x.visivel);
  const k = visiveis.findIndex((v) => v.x.id === id);
  const alvo = visiveis[k + delta];
  if (k < 0 || !alvo) return lista;
  return trocar(lista, visiveis[k]!.idx, alvo.idx);
}

const mapearLista = (l: ItemEstado[], id: string, f: (i: ItemEstado) => ItemEstado) => l.map((i) => (i.id === id ? f(i) : i));

export function moverItem(e: EstadoRevisao, ref: Ref, delta: -1 | 1): EstadoRevisao {
  switch (ref.tipo) {
    case "experiencia": {
      const ordem = moverNaLista(e.experiencias, ref.id, delta);
      return { ...e, experiencias: ordem as ExperienciaEstado[] };
    }
    case "bullet":
      return { ...e, experiencias: e.experiencias.map((x) => (x.id === ref.experienciaId ? { ...x, bullets: moverNaLista(x.bullets, ref.id, delta) } : x)) };
    case "projeto":
      return { ...e, projetos: moverNaLista(e.projetos, ref.id, delta) };
    case "skill":
      return { ...e, skills: moverNaLista(e.skills, ref.id, delta) };
  }
}

/** Itens "sempre visível" não podem ser ocultados. */
export function ehFixo(m: Mestre, ref: Ref): boolean {
  switch (ref.tipo) {
    case "experiencia": return m.experiencias.find((x) => x.id === ref.id)?.sempreVisivel ?? false;
    case "bullet": return m.experiencias.find((x) => x.id === ref.experienciaId)?.bullets.find((b) => b.id === ref.id)?.sempreVisivel ?? false;
    case "projeto": return m.projetos.find((x) => x.id === ref.id)?.sempreVisivel ?? false;
    case "skill": return m.skills.find((x) => x.id === ref.id)?.sempreVisivel ?? false;
  }
}

export function alternarVisivel(e: EstadoRevisao, ref: Ref, m: Mestre): EstadoRevisao {
  if (ehFixo(m, ref)) return e;
  const inverter = (i: ItemEstado): ItemEstado => ({ ...i, visivel: !i.visivel });
  switch (ref.tipo) {
    case "experiencia": return { ...e, experiencias: mapearLista(e.experiencias, ref.id, inverter) as ExperienciaEstado[] };
    case "bullet": return { ...e, experiencias: e.experiencias.map((x) => (x.id === ref.experienciaId ? { ...x, bullets: mapearLista(x.bullets, ref.id, inverter) } : x)) };
    case "projeto": return { ...e, projetos: mapearLista(e.projetos, ref.id, inverter) };
    case "skill": return { ...e, skills: mapearLista(e.skills, ref.id, inverter) };
  }
}

export const usarResumo = (e: EstadoRevisao, id: string): EstadoRevisao => ({ ...e, resumo: id });

export type NovoItem = { tipo: "bullet"; experienciaId: string; id: string; requisitoId?: string } | { tipo: "projeto" | "skill"; id: string; requisitoId?: string };

/** Registra um item recém-criado no mestre: entra visível, logo depois do último visível. */
export function registrarNovo(e: EstadoRevisao, n: NovoItem): EstadoRevisao {
  const inserir = (lista: ItemEstado[]): ItemEstado[] => {
    const ultimo = lista.reduce((u, x, i) => (x.visivel ? i : u), -1);
    return [...lista.slice(0, ultimo + 1), { id: n.id, visivel: true }, ...lista.slice(ultimo + 1)];
  };
  const base: EstadoRevisao = {
    ...e,
    novos: [...e.novos, n.id],
    coberturaManual: n.requisitoId ? { ...e.coberturaManual, [n.id]: [n.requisitoId] } : e.coberturaManual,
  };
  switch (n.tipo) {
    case "bullet": return { ...base, experiencias: base.experiencias.map((x) => (x.id === n.experienciaId ? { ...x, bullets: inserir(x.bullets) } : x)) };
    case "projeto": return { ...base, projetos: inserir(base.projetos) };
    case "skill": return { ...base, skills: inserir(base.skills) };
  }
}

/** Quantos itens VISÍVEIS cobrem cada requisito (IA mais o que a pessoa marcou). Zero é lacuna. */
export function coberturaAtual(e: EstadoRevisao, requisitos: Requisito[], coberturaIA: Selecao["cobertura"]): { requisito: Requisito; itens: number }[] {
  const visiveis = new Set<string>([e.resumo]);
  for (const x of e.experiencias) {
    if (!x.visivel) continue;
    visiveis.add(x.id);
    x.bullets.filter((b) => b.visivel).forEach((b) => visiveis.add(b.id));
  }
  [...e.projetos, ...e.skills].filter((i) => i.visivel).forEach((i) => visiveis.add(i.id));

  const cobre = new Map<string, Set<string>>(); // requisito → itens visíveis que o cobrem
  const somar = (mapa: Record<string, string[]>) => {
    for (const [item, reqs] of Object.entries(mapa)) {
      if (!visiveis.has(item)) continue;
      for (const r of reqs) cobre.set(r, (cobre.get(r) ?? new Set()).add(item));
    }
  };
  somar(coberturaIA);
  somar(e.coberturaManual);
  return requisitos.map((requisito) => ({ requisito, itens: cobre.get(requisito.id)?.size ?? 0 }));
}

/** Itens visíveis a mostrar no currículo, na ordem final. */
export const idsVisiveis = (lista: ItemEstado[]) => lista.filter((i) => i.visivel).map((i) => i.id);
