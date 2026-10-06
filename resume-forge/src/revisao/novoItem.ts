import type { Mestre } from "../mestre/esquema";
import { novoId } from "../mestre/id";
import type { RepositorioMestre } from "../mestre/repositorio";

export type EntradaNovoItem =
  | { tipo: "bullet"; experienciaId: string; texto: string; tags: string[] }
  | { tipo: "projeto"; nome: string; descricao: string; tags: string[] }
  | { tipo: "skill"; nome: string; categoria: string; tags: string[] };

export type ResultadoNovoItem = { ok: true; id: string } | { ok: false; erro: string };

const limpar = (tags: string[]) => tags.map((t) => t.trim()).filter(Boolean);

/** O mestre com o item novo (de ID `id`) já dentro. Pura: o navegador a usa para espelhar o que o servidor gravou. */
export function aplicarNovoNoMestre(m: Mestre, e: EntradaNovoItem, id: string): Mestre {
  const tags = limpar(e.tags);
  switch (e.tipo) {
    case "bullet":
      return { ...m, experiencias: m.experiencias.map((x) => (x.id === e.experienciaId ? { ...x, bullets: [...x.bullets, { id, texto: e.texto.trim(), tags, sempreVisivel: false }] } : x)) };
    case "projeto":
      return { ...m, projetos: [...m.projetos, { id, nome: e.nome.trim(), descricao: e.descricao.trim(), link: "", tags, sempreVisivel: false }] };
    case "skill":
      return { ...m, skills: [...m.skills, { id, nome: e.nome.trim(), categoria: e.categoria.trim(), tags, sempreVisivel: false }] };
  }
}

/** Erro de preenchimento em linguagem de gente, ou null se a entrada serve. */
export function validarNovoItem(m: Mestre, e: EntradaNovoItem): string | null {
  if (e.tipo === "bullet") {
    if (!e.texto.trim()) return "Escreva o texto do bullet.";
    if (!m.experiencias.some((x) => x.id === e.experienciaId)) return "Essa experiência não existe mais no mestre.";
  }
  if (e.tipo === "projeto" && !e.nome.trim()) return "Dê um nome ao projeto.";
  if (e.tipo === "skill" && !e.nome.trim()) return "Escreva o nome da skill.";
  return null;
}

const PREFIXO = { bullet: "b", projeto: "p", skill: "k" } as const;
const SECAO = { bullet: "experiencias", projeto: "projetos", skill: "skills" } as const;

/**
 * Cria o item no currículo mestre (a Revisão não tem texto próprio: tudo que aparece vem do mestre).
 * Experiências novas e versões de resumo só se criam no formulário do mestre.
 */
export async function adicionarAoMestre(repo: RepositorioMestre, e: EntradaNovoItem): Promise<ResultadoNovoItem> {
  const mestre = await repo.ler();
  const erro = validarNovoItem(mestre, e);
  if (erro) return { ok: false, erro };
  const id = novoId(PREFIXO[e.tipo]);
  const secao = SECAO[e.tipo];
  const r = await repo.salvarSecao(secao, aplicarNovoNoMestre(mestre, e, id)[secao]);
  return r.ok ? { ok: true, id } : { ok: false, erro: r.erros.join("; ") };
}
