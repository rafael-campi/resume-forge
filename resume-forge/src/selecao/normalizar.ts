import type { ItensMestre, Requisito, ResultadoNormalizacao, Selecao } from "./tipos";

const ehTexto = (x: unknown): x is string => typeof x === "string";
const listaDeTextos = (x: unknown): string[] | null =>
  Array.isArray(x) && x.every(ehTexto) ? x : null;

function semDuplicatas(ids: string[], aoDescartar: () => void): string[] {
  const vistos = new Set<string>();
  return ids.filter((id) => {
    if (vistos.has(id)) {
      aoDescartar();
      return false;
    }
    vistos.add(id);
    return true;
  });
}

/**
 * Valida e corrige a saída da IA (docs/spec/mvp.md, 4.3).
 *
 * Corrige sozinho o que não é ambíguo: IDs inexistentes, duplicatas, bullet na experiência
 * errada, cobertura de item oculto ou de requisito inexistente, e itens "sempre visível"
 * ausentes. As lacunas são sempre recalculadas a partir da cobertura.
 * Devolve erros quando o formato está quebrado ou o resumo não existe (vale tentar de novo).
 */
export function normalizarSelecao(
  bruto: unknown,
  itens: ItensMestre,
  requisitos: Requisito[],
): ResultadoNormalizacao {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return { ok: false, erros: ["a saída não é um objeto JSON"] };
  }
  const o = bruto as Record<string, unknown>;
  const erros: string[] = [];
  const ajustes: string[] = [];

  if (!ehTexto(o.resumo)) erros.push("`resumo` deve ser o ID de uma versão de resumo");
  else if (!itens.resumos.some((r) => r.id === o.resumo)) {
    erros.push(`resumo inexistente: "${o.resumo}". Use um destes IDs: ${itens.resumos.map((r) => r.id).join(", ")}`);
  }
  if (!Array.isArray(o.experiencias)) erros.push("`experiencias` deve ser uma lista");
  const projetosBrutos = listaDeTextos(o.projetos);
  if (!projetosBrutos) erros.push("`projetos` deve ser uma lista de IDs");
  const skillsBrutas = listaDeTextos(o.skills);
  if (!skillsBrutas) erros.push("`skills` deve ser uma lista de IDs");
  if (erros.length) return { ok: false, erros };

  const dup = (onde: string) => () => ajustes.push(`duplicata removida em ${onde}`);

  // Experiências e bullets
  const experiencias: Selecao["experiencias"] = [];
  const idsExp = semDuplicatas(
    (o.experiencias as unknown[]).map((e) => (e as { id?: unknown })?.id).filter(ehTexto),
    dup("experiências"),
  );
  for (const id of idsExp) {
    const real = itens.experiencias.find((e) => e.id === id);
    if (!real) {
      ajustes.push(`experiência inexistente removida: ${id}`);
      continue;
    }
    const bruta = (o.experiencias as { id?: unknown; bullets?: unknown }[]).find((e) => e?.id === id);
    const bullets = semDuplicatas(listaDeTextos(bruta?.bullets) ?? [], dup(`bullets de ${id}`)).filter((b) => {
      const ok = real.bullets.some((x) => x.id === b);
      if (!ok) ajustes.push(`bullet ${b} removido: não pertence a ${id}`);
      return ok;
    });
    experiencias.push({ id, bullets });
  }

  const filtrar = (ids: string[], validos: { id: string }[], onde: string) =>
    semDuplicatas(ids, dup(onde)).filter((id) => {
      const ok = validos.some((v) => v.id === id);
      if (!ok) ajustes.push(`${onde}: ID inexistente removido: ${id}`);
      return ok;
    });
  const projetos = filtrar(projetosBrutos!, itens.projetos, "projetos");
  const skills = filtrar(skillsBrutas!, itens.skills, "skills");

  // Itens "sempre visível" ficam fora da decisão da IA: o código os insere no começo.
  const garantir = (ids: string[], todos: { id: string; sempreVisivel?: boolean }[], onde: string) => {
    const faltando = todos.filter((t) => t.sempreVisivel && !ids.includes(t.id)).map((t) => t.id);
    if (faltando.length) ajustes.push(`${onde}: inseridos itens sempre visíveis: ${faltando.join(", ")}`);
    return [...faltando, ...ids];
  };
  const projetosFinal = garantir(projetos, itens.projetos, "projetos");
  const skillsFinal = garantir(skills, itens.skills, "skills");
  for (const real of itens.experiencias) {
    let atual = experiencias.find((e) => e.id === real.id);
    if (real.sempreVisivel && !atual) {
      atual = { id: real.id, bullets: [] };
      experiencias.unshift(atual);
      ajustes.push(`experiência sempre visível inserida: ${real.id}`);
    }
    if (atual) {
      const faltando = real.bullets.filter((b) => b.sempreVisivel && !atual!.bullets.includes(b.id)).map((b) => b.id);
      if (faltando.length) {
        atual.bullets = [...faltando, ...atual.bullets];
        ajustes.push(`bullets sempre visíveis inseridos em ${real.id}: ${faltando.join(", ")}`);
      }
    }
  }
  let resumo = o.resumo as string;
  const fixos = itens.resumos.filter((r) => r.sempreVisivel);
  if (fixos.length && !fixos.some((r) => r.id === resumo)) {
    ajustes.push(`resumo sempre visível substituiu a escolha da IA: ${fixos[0]!.id}`);
    resumo = fixos[0]!.id;
  }

  // Cobertura: só itens mostrados e requisitos que existem
  const mostrados = new Set<string>([
    resumo,
    ...experiencias.flatMap((e) => [e.id, ...e.bullets]),
    ...projetosFinal,
    ...skillsFinal,
  ]);
  const idsReq = new Set(requisitos.map((r) => r.id));
  const cobertura: Selecao["cobertura"] = {};
  const cobBruta = typeof o.cobertura === "object" && o.cobertura !== null && !Array.isArray(o.cobertura)
    ? (o.cobertura as Record<string, unknown>)
    : {};
  for (const [item, reqs] of Object.entries(cobBruta)) {
    if (!mostrados.has(item)) {
      ajustes.push(`cobertura removida: item não mostrado ${item}`);
      continue;
    }
    const lista = semDuplicatas(listaDeTextos(reqs) ?? [], dup(`cobertura de ${item}`)).filter((r) => {
      const ok = idsReq.has(r);
      if (!ok) ajustes.push(`cobertura de ${item}: requisito inexistente removido: ${r}`);
      return ok;
    });
    if (lista.length) cobertura[item] = lista;
  }

  const cobertos = new Set(Object.values(cobertura).flat());
  const lacunas = requisitos.map((r) => r.id).filter((id) => !cobertos.has(id));
  const declaradas = (listaDeTextos(o.lacunas) ?? []).slice().sort().join();
  if (declaradas !== lacunas.slice().sort().join()) ajustes.push("lacunas recalculadas a partir da cobertura");

  return {
    ok: true,
    ajustes,
    selecao: { resumo, experiencias, projetos: projetosFinal, skills: skillsFinal, cobertura, lacunas },
  };
}

export function normalizarRequisitos(bruto: unknown): { ok: true; requisitos: Requisito[] } | { ok: false; erros: string[] } {
  const lista = (bruto as { requisitos?: unknown } | null)?.requisitos;
  if (!Array.isArray(lista) || lista.length === 0) return { ok: false, erros: ["`requisitos` deve ser uma lista não vazia"] };
  const vistos = new Set<string>();
  const erros: string[] = [];
  const requisitos: Requisito[] = [];
  for (const r of lista) {
    const { id, texto } = (r ?? {}) as { id?: unknown; texto?: unknown };
    if (!ehTexto(id) || !ehTexto(texto) || !texto.trim()) erros.push("cada requisito precisa de `id` e `texto` não vazio");
    else if (vistos.has(id)) erros.push(`ID de requisito duplicado: ${id}`);
    else {
      vistos.add(id);
      requisitos.push({ id, texto: texto.trim() });
    }
  }
  return erros.length ? { ok: false, erros } : { ok: true, requisitos };
}
