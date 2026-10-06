import type { ItensMestre } from "../selecao/tipos";
import { formatarMesAno } from "./completude";
import type { Mestre } from "./esquema";

/**
 * O que a IA pode selecionar (módulo de seleção). Nunca inclui nome nem contato.
 * Formação e idiomas ficam fora (sempre visíveis); certificações ainda não são selecionáveis no módulo de seleção.
 * Itens em branco não vão para a IA.
 */
export function paraItensMestre(m: Mestre): ItensMestre {
  const preenchido = (s: string) => s.trim() !== "";
  return {
    resumos: m.resumos.filter((r) => preenchido(r.texto)).map((r) => ({ id: r.id, texto: r.texto })),
    experiencias: m.experiencias
      .filter((e) => preenchido(e.empresa) || preenchido(e.cargo))
      .map((e) => ({
        id: e.id,
        titulo: [e.empresa, e.cargo, periodo(e.inicio, e.fim)].filter(preenchido).join(" · "),
        bullets: e.bullets.filter((b) => preenchido(b.texto)).map((b) => ({ id: b.id, texto: b.texto, tags: b.tags, sempreVisivel: b.sempreVisivel })),
        tags: e.tags,
        sempreVisivel: e.sempreVisivel,
      })),
    projetos: m.projetos
      .filter((p) => preenchido(p.nome))
      .map((p) => ({ id: p.id, texto: p.descricao ? `${p.nome}: ${p.descricao}` : p.nome, tags: p.tags, sempreVisivel: p.sempreVisivel })),
    skills: m.skills.filter((s) => preenchido(s.nome)).map((s) => ({ id: s.id, texto: s.nome, tags: s.tags, sempreVisivel: s.sempreVisivel })),
  };
}

function periodo(inicio: Mestre["experiencias"][number]["inicio"], fim: Mestre["experiencias"][number]["fim"]): string {
  if (!inicio) return "";
  return `${formatarMesAno(inicio)}–${fim === "atual" ? "atual" : fim ? formatarMesAno(fim) : ""}`;
}
